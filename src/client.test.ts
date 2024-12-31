import { describe, expect, it, vi } from 'vitest';
import { defaultConfig } from './client';

describe('defaultConfig', () => {
  it('loads password grant', async () => {
    vi.stubEnv('NERIS_BASE_URL', 'http://api.endpoint');
    vi.stubEnv('NERIS_GRANT_TYPE', 'password');
    vi.stubEnv('NERIS_USERNAME', 'homestar runner');
    vi.stubEnv('NERIS_PASSWORD', 'fhqwhgads');
    vi.stubEnv('NERIS_CLIENT_ID', 'nope');
    vi.stubEnv('NERIS_CLIENT_SECRET', 'naw dawg');

    const got = defaultConfig();

    expect(got.baseUrl).toEqual('http://api.endpoint');
    expect(got.auth).toEqual({ _type: 'password', username: 'homestar runner', password: 'fhqwhgads' });
  });

  it('loads client_credentials grant', async () => {
    vi.stubEnv('NERIS_BASE_URL', 'http://api.endpoint');
    vi.stubEnv('NERIS_GRANT_TYPE', 'client_credentials');
    vi.stubEnv('NERIS_USERNAME', 'nobody');
    vi.stubEnv('NERIS_PASSWORD', 'negative');
    vi.stubEnv('NERIS_CLIENT_ID', '12345');
    vi.stubEnv('NERIS_CLIENT_SECRET', 'abcdef');

    const got = defaultConfig();

    expect(got.baseUrl).toEqual('http://api.endpoint');
    expect(got.auth).toEqual({ _type: 'client_credentials', client_id: '12345', client_secret: 'abcdef' });
  });

  it('defaults to production base url', async () => {
    vi.stubEnv('NERIS_GRANT_TYPE', 'password');

    const got = defaultConfig();

    expect(got.baseUrl).toEqual('https://api.neris.fsri.org/v1');
  });
});
