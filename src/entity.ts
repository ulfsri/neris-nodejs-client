import { components } from './neris-api';

export type DepartmentResponse = components['schemas']['DepartmentResponse'];
export type FireMarshalResponse = components['schemas']['FireMarshalResponse'];
export type EntityResponse = DepartmentResponse | FireMarshalResponse;

export enum EntityType {
  FireDepartment = 'FD',
  FireMarshall = 'FM',
  Vendor = 'VN',
}

// entity returns two different responses, but there is no explicit field to check
// that typescript can use to guarantee it's a department by checking the response.
// The prefix of the entity id can be used to detect the type.
export const parseEntityType = (entityID: string): EntityType | undefined => {
  switch (entityID.substring(0, 2)) {
    case EntityType.FireDepartment:
      return EntityType.FireDepartment;
    case EntityType.FireMarshall:
      return EntityType.FireMarshall;
    case EntityType.Vendor:
      return EntityType.Vendor;
    default:
      return undefined;
  }
};

// This helper mostly casts the entity.
export const asEntityType = <T extends EntityResponse>(entity: EntityResponse, wanted: EntityType): T | undefined => {
  if (parseEntityType(entity.neris_id) === wanted) {
    return entity as T;
  }

  return undefined;
};
