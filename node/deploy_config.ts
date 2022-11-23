import { promises as fs } from 'fs'
import { dirname, resolve } from 'path'

import type { Declaration } from './declaration.js'
import { ImportMapFile, readFile as readImportMap } from './import_map.js'
import type { Layer } from './layer.js'
import type { Logger } from './logger.js'
import { isNodeError } from './utils/error.js'

/* eslint-disable camelcase */
interface DeployConfigFile {
  functions?: Declaration[]
  import_map?: string
  layers?: Layer[]
  version: number
}
/* eslint-enable camelcase */

export interface DeployConfig {
  declarations: Declaration[]
  importMap?: ImportMapFile
  layers: Layer[]
}

export const load = async (path: string | undefined, logger: Logger): Promise<DeployConfig> => {
  if (path === undefined) {
    return {
      declarations: [],
      layers: [],
    }
  }

  try {
    const data = await fs.readFile(path, 'utf8')
    const config = JSON.parse(data) as DeployConfigFile

    return parse(config, path)
  } catch (error) {
    if (isNodeError(error) && error.code !== 'ENOENT') {
      logger.system('Error while parsing internal edge functions manifest:', error)
    }
  }

  return {
    declarations: [],
    layers: [],
  }
}

const parse = async (data: DeployConfigFile, path: string): Promise<DeployConfig> => {
  if (data.version !== 1) {
    throw new Error(`Unsupported file version: ${data.version}`)
  }

  const config = {
    declarations: data.functions ?? [],
    layers: data.layers ?? [],
  }

  if (data.import_map) {
    const importMapPath = resolve(dirname(path), data.import_map)
    const importMap = await readImportMap(importMapPath)

    return {
      ...config,
      importMap,
    }
  }

  return config
}