import { renderApp } from '@robinplatform/toolkit/react';
import { useRpcQuery } from '@robinplatform/toolkit/react/rpc';
import React from 'react';
import { getSelfSource } from './page.server';
import '@robinplatform/toolkit/styles.css';
import './ext.scss';

function Page() {
	const { data, error } = useRpcQuery(getSelfSource, {
		filename: './package.json',
	});

	return (
		<pre
			style={{
				margin: '1rem',
				padding: '1rem',
				background: '#e3e3e3',
				borderRadius: 'var(--robin-border-radius)',
			}}
		>
			<code>{error ? String(error) : data ? String(data) : 'Loading ...'}</code>
		</pre>
	);
}

renderApp(<Page />);
