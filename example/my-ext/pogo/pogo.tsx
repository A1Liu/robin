import React from 'react';
import { useCurrentPage } from './components/SelectPage';
import { EventPlanner } from './pages/EventPlanner';
import { PokemonManager } from './pages/PokemonManager';
import { Tables } from './pages/Tables';

// "PoGo" is an abbreviation for Pokemon Go which is well-known in the
// PoGo community.
export function Pogo(): JSX.Element {
	const { page } = useCurrentPage();

	switch (page) {
		case 'pokemon':
			return <PokemonManager />;
		case 'planner':
			return <EventPlanner />;
		case 'tables':
			return <Tables />;
	}
}
