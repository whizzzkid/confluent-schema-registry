import avro, { ForSchemaOptions } from 'avsc'

import { Schema, SchemaRef } from './@types'

export default class Cache {
  registryIdBySubject: { [key: string]: number }
  schemasByRegistryId: { [key: string]: Schema }
  registryIdBySchemaRef: { [key: string]: number }
  forSchemaOptions?: Partial<ForSchemaOptions>

  constructor(forSchemaOptions?: Partial<ForSchemaOptions>) {
    this.registryIdBySubject = {}
    this.schemasByRegistryId = {}
    this.registryIdBySchemaRef = {}
    this.forSchemaOptions = forSchemaOptions
  }

  private schemaKeyGen = ({ subject, version }: SchemaRef): string => `${subject}:${version}`

  getRegistryIdBySchemaRef = (schema: SchemaRef): number =>
    this.registryIdBySchemaRef[this.schemaKeyGen(schema)]

  setRegistryIdBySchemaRef = (schema: SchemaRef, registryId: number) => {
    this.registryIdBySchemaRef[this.schemaKeyGen(schema)] = registryId

    return this.registryIdBySchemaRef[this.schemaKeyGen(schema)]
  }

  getLatestRegistryId = (subject: string): number | undefined => this.registryIdBySubject[subject]

  setLatestRegistryId = (subject: string, id: number): number => {
    this.registryIdBySubject[subject] = id

    return this.registryIdBySubject[subject]
  }

  getSchema = (registryId: number): Schema => this.schemasByRegistryId[registryId]

  setSchema = (
    registryId: number,
    schema: Schema,
    logicalTypesExtra: Record<string, Schema> = {},
  ) => {
    // @ts-ignore TODO: Fix typings for Schema...
    this.schemasByRegistryId[registryId] = avro.Type.forSchema(schema, {
      ...this.forSchemaOptions,
      typeHook:
        typeof this.forSchemaOptions?.typeHook === 'function'
          ? this.forSchemaOptions?.typeHook
          : (attr, opts) => {
              if (typeof attr == 'string') {
                if (attr in opts.logicalTypes) {
                  return opts.logicalTypes[attr]
                }
                // if we map this as 'namespace.type'.
                const qualifiedName = `${opts.namespace}.${attr}`
                if (qualifiedName in opts.logicalTypes) {
                  return opts.logicalTypes[qualifiedName]
                }
              }
            },
      logicalTypes: {
        ...this.forSchemaOptions?.logicalTypes,
        ...logicalTypesExtra,
      },
    })

    return this.schemasByRegistryId[registryId]
  }

  clear = (): void => {
    this.registryIdBySubject = {}
    this.schemasByRegistryId = {}
  }
}
