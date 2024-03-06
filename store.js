// store.js

import { JSONFilePreset } from 'lowdb/node';

const updateDB = async ( newData) => {
  const defaultData = { cache: [] };
  const db = await JSONFilePreset('db.json', defaultData);
  await db.update(({ cache }) => cache.push(newData));
};

export {  updateDB };
