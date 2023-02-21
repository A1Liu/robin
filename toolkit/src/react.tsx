import React from 'react';
import ReactDOM from 'react-dom';

type State = { hasError: boolean; error?: unknown };

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
	state: State = { hasError: false };

	componentDidCatch(error: unknown) {
		this.setState({ hasError: true, error });
	}

	render() {
		if (this.state.hasError) {
			const error = this.state.error;
			return (
				<div
					style={{
						width: '100%',
						height: '100%',
						maxHeight: '100vh',
						display: 'flex',
						flexDirection: 'column',
						padding: '1.25rem',
						gap: '1.25rem',
						boxSizing: 'border-box',
					}}
				>
					<h1
						style={{
							padding: 0,
							margin: 0,
							fontSize: '2.25rem',
						}}
					>
						The app crashed
					</h1>

					<pre
						style={{
							margin: 0,
							boxSizing: 'border-box',
							padding: '1.25rem',
							backgroundColor: 'lightgray',
							borderRadius: '5px',
							width: '100%',
							overflowY: 'auto',
						}}
					>
						<code>
							{String((error as Error)?.message || error)}
						</code>
					</pre>
				</div>
			);
		}

		return this.props.children;
	}
}

export function renderApp(content: React.ReactNode) {
	ReactDOM.render(
		<ErrorBoundary>
			{content}
		</ErrorBoundary>,
		document.getElementById('root'),
	);
}
