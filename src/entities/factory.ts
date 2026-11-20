import { Pokemon } from './pokemon';
import { Charizard } from './charizard';
import { Blastoise } from './blastoise';
import { Venusaur } from './venusaur';
import { Lucario } from './lucario';
import { PokemonId } from '../ui';

export function createPokemon(id: PokemonId, x: number, y: number, isPlayer: boolean): Pokemon {
  let p: Pokemon;
  switch (id) {
    case 'blastoise':
      p = new Blastoise(x, y);
      break;
    case 'venusaur':
      p = new Venusaur(x, y);
      break;
    case 'lucario':
      p = new Lucario(x, y);
      break;
    case 'charizard':
    default:
      p = new Charizard(x, y);
      break;
  }
  p.isPlayer = isPlayer;
  return p;
}
