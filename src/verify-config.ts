import { instances, CORE_REPOSITORY } from './config';

console.log(`${instances.length} instances loaded`);

const espoo = instances.find((i) => i.name === 'Espoo');
if (espoo) {
  console.log(`Espoo found: domain=${espoo.domain}, type=${espoo.type}`);
  console.log(`Core repository: ${CORE_REPOSITORY}`);
} else {
  console.error('Espoo not found!');
  process.exit(1);
}
