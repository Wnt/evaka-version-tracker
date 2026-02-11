import { InstanceConfig } from './types';

export const instances: InstanceConfig[] = [
  {
    name: 'Espoo',
    domain: 'espoonvarhaiskasvatus.fi',
    repository: 'espoon-voltti/evaka',
    type: 'Core',
  },
  {
    name: 'Oulu',
    domain: 'varhaiskasvatus.ouka.fi',
    repository: 'Oulunkaupunki/evakaoulu',
    type: 'Wrapper',
  },
  {
    name: 'Turku',
    domain: 'evaka.turku.fi',
    repository: 'City-of-Turku/evakaturku',
    type: 'Wrapper',
  },
  {
    name: 'Hämeenkyrö',
    domain: 'evaka.hameenkyro.fi',
    repository: 'Tampere/trevaka',
    type: 'Wrapper',
  },
  {
    name: 'Kangasala',
    domain: 'evaka.kangasala.fi',
    repository: 'Tampere/trevaka',
    type: 'Wrapper',
  },
  {
    name: 'Lempäälä',
    domain: 'evaka.lempaala.fi',
    repository: 'Tampere/trevaka',
    type: 'Wrapper',
  },
  {
    name: 'Nokia',
    domain: 'evaka.nokiankaupunki.fi',
    repository: 'Tampere/trevaka',
    type: 'Wrapper',
  },
  {
    name: 'Orivesi',
    domain: 'evaka.orivesi.fi',
    repository: 'Tampere/trevaka',
    type: 'Wrapper',
  },
  {
    name: 'Pirkkala',
    domain: 'evaka.pirkkala.fi',
    repository: 'Tampere/trevaka',
    type: 'Wrapper',
  },
  {
    name: 'Tampere',
    domain: 'varhaiskasvatus.tampere.fi',
    repository: 'Tampere/trevaka',
    type: 'Wrapper',
  },
  {
    name: 'Vesilahti',
    domain: 'evaka.vesilahti.fi',
    repository: 'Tampere/trevaka',
    type: 'Wrapper',
  },
  {
    name: 'Ylöjärvi',
    domain: 'evaka.ylojarvi.fi',
    repository: 'Tampere/trevaka',
    type: 'Wrapper',
  },
];

export const CORE_REPOSITORY = 'espoon-voltti/evaka';
