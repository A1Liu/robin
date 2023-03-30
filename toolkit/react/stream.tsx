import React from 'react';
import { z } from 'zod';
import { Stream } from '../stream';
import stableStringify from 'json-stable-stringify';

const PubsubData = z.object({
	// Kind is not sent from the server; instead, its used by the frontend to tell the stream
	// to set the state properly
	kind: z.union([z.literal('state'), z.literal('user')]).optional(),

	messageId: z.number(),
	data: z.unknown(),
});

export function useTopicQuery<State, Output>({
	topicId,
	fetchState,
	reducer,
	resultType,
	skip,
}: {
	resultType: z.Schema<Output>;
	topicId?: { category: string; key: string };
	fetchState: () => Promise<{ state: State; counter: number }>;
	reducer: (s: State, o: Output) => State;
	skip?: boolean;
}) {
	type StreamState =
		| { kind: 'empty'; seenMessages: z.infer<typeof PubsubData>[] }
		| {
				kind: 'state';
				seenMessages?: undefined;
				counter: number;
				state: State;
		  };

	const { state, dispatch: rawDispatch } = useStreamMethod({
		methodName: 'SubscribeTopic',
		resultType: PubsubData,
		data: { id: topicId },
		skip: skip || !topicId,
		initialState: { kind: 'empty', seenMessages: [] },
		onConnection: () => {
			fetchState().then((data) =>
				rawDispatch({
					kind: 'state',
					messageId: data.counter,
					data: data.state,
				}),
			);
		},
		reducer: (prev: StreamState, packet): StreamState => {
			if (packet.kind === 'state') {
				if (prev.kind === 'state' && prev.counter > packet.messageId) {
					return prev;
				}

				const state = (prev.seenMessages ?? [])
					.filter((msg) => msg.messageId > packet.messageId)
					.flatMap((msg) => {
						const res = resultType.safeParse(msg.data);
						if (res.success) {
							return [res.data];
						}

						return [];
					})
					.reduce((prev, data) => reducer(prev, data), packet.data as State);

				return {
					kind: 'state',
					counter: packet.messageId,
					state,
				};
			}

			if (prev.kind === 'empty') {
				return {
					kind: 'empty',
					seenMessages: [...prev.seenMessages, packet],
				};
			} else {
				const res = resultType.safeParse(packet.data);
				if (res.success) {
					return {
						kind: 'state',
						counter: packet.messageId,
						state: reducer(prev.state, res.data),
					};
				}

				console.warn('Failed to parse data:', JSON.stringify(packet));
				return prev;
			}
		},
	});

	if (state.kind === 'empty') {
		return { state: undefined };
	}

	return { state: state.state };
}

export function useStreamMethod<State, Output>({
	methodName,
	data: initialData,
	initialState,
	reducer,
	resultType,
	onConnection,
	skip,
}: {
	resultType: z.Schema<Output>;
	methodName: string;
	data: object;
	initialState: State;
	reducer: (s: State, o: Output) => State;
	onConnection?: () => void;
	skip?: boolean;
}) {
	// enforce reducer stability
	const reducerRef = React.useRef(reducer);
	reducerRef.current = reducer;

	// enforce callback stability
	const onConnRef = React.useRef(onConnection);
	onConnRef.current = onConnection;

	const cb = React.useCallback(
		(s: State, o: Output) => reducerRef.current(s, o),
		[],
	);

	const [state, dispatch] = React.useReducer(cb, initialState);

	React.useEffect(() => {
		if (skip) {
			return;
		}

		const id = `${methodName}-${Math.random()}`;

		const stream = new Stream(methodName, id);

		stream.onmessage = (message) => {
			const { kind, data } = message as { kind: string; data: string };
			if (kind !== 'methodOutput') {
				return;
			}

			const res = resultType.safeParse(data);
			if (!res.success) {
				// TODO: handle the error
				stream.onerror(res.error);
				return;
			}

			dispatch(res.data);
		};

		stream.start(initialData).then(() => onConnRef.current?.());

		return () => {
			stream.close();
		};

		// initialData JSON is here, so that when you change the information
		// in the parameters, you get a new stream.
	}, [skip, methodName, stableStringify(initialData)]);

	return { state, dispatch };
}
