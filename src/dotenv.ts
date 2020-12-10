import { rootFolder } from './get-workspaces';
import { resolve } from 'path';
require('dotenv').config({
  path: resolve(rootFolder, '.env'),
});
