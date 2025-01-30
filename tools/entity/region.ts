import { createNerisClient } from '@api-client/client';
import { asEntityType, DepartmentResponse, EntityType, parseEntityType } from '@api-client/entity';
import { components, typeRegionValueValues } from '@api-client/neris-api.d';
import { Command } from 'commander';
import { readFile } from 'fs/promises';
import shp from 'shpjs';

export const upsertRegion = (program: Command) => {
  program
    .command('upsert_region')
    .description(
      'Parses a shapefile and adds the geometry as a RegionSet to the entity. If a region with the same name already exists, it is updated.',
    )
    .argument('<entityID>', 'Entity ID')
    .option('-f, --filePath <file>', 'Path to a zipfile containing the shapefile(s). e.g. /path/to/geo.zip')
    .option('-n, --name <string>', 'Name of the RegionSet. default: The value for regionType')
    .requiredOption<components['schemas']['TypeRegionValue']>(
      '-t, --regionType <TypeRegionValue>',
      `Region type. ${typeRegionValueValues.join()}`,
      (val) => {
        if (typeRegionValueValues.indexOf(val as any) === -1) {
          throw new Error(`bad region type. options: ${typeRegionValueValues.join()}`);
        }

        return val as components['schemas']['TypeRegionValue'];
      },
    )
    .action(
      async (
        entityID: string,
        {
          filePath,
          regionType,
          name,
        }: { filePath: string; regionType: components['schemas']['TypeRegionValue']; name: string },
      ) => {
        if (!entityID) {
          program.error('Entity ID is required');
        }
        if (!filePath) {
          program.error('Shapefile is required');
        }

        // Type of the entity is encoded in the neris_id
        if (parseEntityType(entityID) !== EntityType.FireDepartment) {
          program.error('Entity is not a department.');
        }

        const regionName = name || regionType.toLowerCase();
        const zipData = await readFile(filePath);
        const geojson = await shp(zipData);
        const geojsonArray = Array.isArray(geojson) ? geojson : [geojson];

        const region_sets: components['schemas']['RegionSetPayload'][] = [
          {
            name: regionName,
            type: regionType,
            primary: false,
            coverage: false,
            juris: regionType === 'JURISDICTION',
            regions: geojsonArray.reduce(
              (acc: components['schemas']['RegionPayload'][], featureCollection) => {
                featureCollection.features.forEach((f) => {
                  const baseProps = {
                    crs: 4326,
                    name: regionName,
                    internal_id: regionName,
                  };

                  switch (f.geometry.type) {
                    case 'Polygon':
                      // the api only accepts MultiPolygon so convert the polygon.
                      acc.push({
                        ...baseProps,
                        geometry: {
                          type: 'MultiPolygon',
                          coordinates: [f.geometry.coordinates],
                        },
                      });
                      break;

                    case 'MultiPolygon':
                      acc.push({
                        ...baseProps,
                        geometry: {
                          type: 'MultiPolygon',
                          coordinates: f.geometry.coordinates,
                        },
                      });
                      break;
                    default:
                      program.error('Unsupported geometry in shapefile. Must be Polygon or MultiPolygon.');
                  }
                });

                return acc;
              },
              [] as components['schemas']['RegionPayload'][],
            ),
          },
        ];

        const client = createNerisClient();
        const resGet = await client.GET(`/entity/{neris_id_entity}`, {
          params: { path: { neris_id_entity: entityID } },
        });

        if (resGet.error) {
          program.error(JSON.stringify(resGet.error.detail));
        } else if (resGet.response.status !== 200) {
          program.error(`Invalid entity. status: ${resGet.response.status} ${resGet.response.statusText}`);
        }

        const dept = asEntityType<DepartmentResponse>(resGet.data, EntityType.FireDepartment);
        if (!dept) {
          program.error('Entity is not a department.');
        }

        const existingRegionSets = dept.region_sets || [];

        // PATCH /entity uses region_sets and overwrites the old values.
        // To avoid data loss, the existing ones need to be pushed back to the API.
        for (let s of existingRegionSets) {
          const alreadyInUpdate = region_sets.findIndex((rs) => rs.name === s.name) !== -1;

          if (!alreadyInUpdate) {
            // PATCH /entity replaces the region_sets collection. There is no option to manage region sets individually add, update, remove, etc
            // To get the geometry properties to re-insert existing records, we have to request it from the geojson api.

            region_sets.push({
              ...s,
              type: s.type as components['schemas']['RegionSetPayload']['type'],
              regions: await Promise.all(
                (s.regions || []).map(async (r) => {
                  const geometry = await client.fetchGeometry(new URL(r.url));

                  const region: components['schemas']['RegionPayload'] = {
                    crs: 4326,
                    name: r.name,
                    internal_id: r.internal_id,
                    geometry,
                  };

                  return region;
                }),
              ),
            });
          }
        }

        const resPatch = await client.PATCH(`/entity/{neris_id_entity}`, {
          params: { path: { neris_id_entity: entityID } },
          body: {
            region_sets,
          },
        });

        if (resPatch.error) {
          program.error((resPatch.error.detail || []).map((d) => d.msg).join('\n'));
        }

        console.log(`RegionSet ${name} was added from ${dept.name}.`);
        console.log('✨ Success ✨');
      },
    );
};

export const removeRegion = (program: Command) => {
  program
    .command('remove_region')
    .description('Removes a RegionSet from the entity. ')
    .argument('<entityID>', 'Entity ID')
    .requiredOption('-n, --name <string>', 'Name of the RegionSet to remove')
    .action(async (entityID: string, { name }: { name: string }) => {
      if (!entityID) {
        program.error('Entity ID is required');
      }
      if (!name) {
        program.error('Shapefile is required');
      }

      // Type of the entity is encoded in the neris_id
      if (parseEntityType(entityID) !== EntityType.FireDepartment) {
        program.error('Entity is not a department.');
      }

      const client = createNerisClient();
      const resGet = await client.GET(`/entity/{neris_id_entity}`, {
        params: { path: { neris_id_entity: entityID } },
      });

      if (resGet.error) {
        program.error(JSON.stringify(resGet.error.detail));
      } else if (resGet.response.status !== 200) {
        program.error(`Invalid entity. status: ${resGet.response.status} ${resGet.response.statusText}`);
      }

      const dept = asEntityType<DepartmentResponse>(resGet.data, EntityType.FireDepartment);
      if (!dept) {
        program.error('Entity is not a department.');
      }

      const oldRegionSets = dept.region_sets || [];
      const idx = oldRegionSets.findIndex((s) => s.name === name);

      if (idx === -1) {
        program.error(`RegionSet named "${name}" not found. Nothing to do.`);
      }

      oldRegionSets.splice(idx, 1);

      const region_sets: components['schemas']['RegionSetPayload'][] = [];

      for (let s of oldRegionSets) {
        region_sets.push({
          ...s,
          type: s.type as components['schemas']['RegionSetPayload']['type'],
          regions: await Promise.all(
            (s.regions || []).map(async (r) => {
              const geometry = await client.fetchGeometry(new URL(r.url));

              const region: components['schemas']['RegionPayload'] = {
                crs: 4326,
                name: r.name,
                internal_id: r.internal_id,
                geometry,
              };

              return region;
            }),
          ),
        });
      }

      const resPatch = await client.PATCH(`/entity/{neris_id_entity}`, {
        params: { path: { neris_id_entity: entityID } },
        body: {
          region_sets,
        },
      });

      if (resPatch.error) {
        program.error((resPatch.error.detail || []).map((d) => d.msg).join('\n'));
      }

      console.log(`RegionSet ${name} was removed from ${dept.name}.`);
      console.log('✨ Success ✨');
    });
};
