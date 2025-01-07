import { HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { authMiddleware } from './auth';

describe('auth middleware. _type == access_token', () => {
  it('sets auth header', async () => {
    const mw = authMiddleware({
      baseUrl: 'http://base.url',
      auth: { _type: 'access_token', access_token: 'AddressingFireProblems' },
    });

    expect(mw.onRequest).toBeDefined();

    if (mw.onRequest) {
      const got = await mw.onRequest({
        request: new Request('http://some.url', {
          headers: { test: 'whatever' },
        }),
      } as any);

      expect(got?.headers.get('test')).toEqual('whatever');
      expect(got?.headers.get('authorization')).toEqual('Bearer AddressingFireProblems');
    }
  });
});

describe('auth middleware. _type == password', () => {
  it('gets access token and reuses if not expired.', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      HttpResponse.json(
        {
          access_token: 'passwd_access_token',
          expires_in: 120,
        },
        { status: 200 },
      ),
    );

    const mw = authMiddleware({
      baseUrl: 'http://base.url',
      fetch: mockFetch,
      auth: {
        _type: 'password',
        username: 'fsri',
        password: 'AddressingFireProblems',
      },
    });

    expect(mw.onRequest).toBeDefined();

    if (mw.onRequest) {
      const got = await mw.onRequest({
        request: new Request('http://some.url', {
          headers: { test: 'whatever' },
        }),
      } as any);

      expect(got?.headers.get('test')).toEqual('whatever');
      expect(got?.headers.get('authorization')).toEqual('Bearer passwd_access_token');

      const got2 = await mw.onRequest({
        request: new Request('http://some.url', {
          headers: { test: 'whatever' },
        }),
      } as any);

      expect(got2?.headers.get('test')).toEqual('whatever');
      expect(got2?.headers.get('authorization')).toEqual('Bearer passwd_access_token');

      // should only be called 1x b/c the first call sets the access token and it is not expired.
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const req = mockFetch.mock.calls[0][0];

      expect(req.url).toEqual('http://base.url/token');
      expect(req.headers.get('content-type')).toEqual('application/x-www-form-urlencoded');
      expect(await req.text()).toEqual(`grant_type=password&username=fsri&password=AddressingFireProblems`);
    }
  });

  it('gets access token and requests a new one if expired.', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        HttpResponse.json(
          {
            access_token: 'access_token_one',
            expires_in: 0,
          },
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        HttpResponse.json(
          {
            access_token: 'access_token_two',
            expires_in: 0,
          },
          { status: 200 },
        ),
      );

    const mw = authMiddleware({
      baseUrl: 'http://base.url',
      fetch: mockFetch,
      auth: {
        _type: 'password',
        username: 'fsri',
        password: 'AddressingFireProblems',
      },
    });

    expect(mw.onRequest).toBeDefined();

    if (mw.onRequest) {
      const got = await mw.onRequest({
        request: new Request('http://some.url', {
          headers: { test: 'whatever' },
        }),
      } as any);

      expect(got?.headers.get('test')).toEqual('whatever');
      expect(got?.headers.get('authorization')).toEqual('Bearer access_token_one');

      const got2 = await mw.onRequest({
        request: new Request('http://some.url', {
          headers: { test: 'whatever' },
        }),
      } as any);

      expect(got2?.headers.get('test')).toEqual('whatever');
      expect(got2?.headers.get('authorization')).toEqual('Bearer access_token_two');

      // should be called on each invocation since the token is always expired.
      expect(mockFetch).toHaveBeenCalledTimes(2);

      const req0 = mockFetch.mock.calls[0][0];
      expect(req0.url).toEqual('http://base.url/token');
      expect(req0.headers.get('content-type')).toEqual('application/x-www-form-urlencoded');
      expect(await req0.text()).toEqual(`grant_type=password&username=fsri&password=AddressingFireProblems`);

      // next call to refresh token since it is expired.
      const req1 = mockFetch.mock.calls[1][0];
      expect(req1.url).toEqual('http://base.url/token');
      expect(req1.headers.get('content-type')).toEqual('application/x-www-form-urlencoded');
      expect(await req1.text()).toEqual(`grant_type=password&username=fsri&password=AddressingFireProblems`);
    }
  });
});

describe('auth middleware. _type == client_credentials', () => {
  it('gets access token and reuses if not expired.', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      HttpResponse.json(
        {
          access_token: 'client_access_token',
          refresh_token: 'client_refresh_token',
          expires_in: 120,
        },
        { status: 200 },
      ),
    );

    const mw = authMiddleware({
      baseUrl: 'http://base.url',
      fetch: mockFetch,
      auth: {
        _type: 'client_credentials',
        client_id: '123',
        client_secret: 'shhh',
      },
    });

    expect(mw.onRequest).toBeDefined();

    if (mw.onRequest) {
      const got = await mw.onRequest({
        request: new Request('http://some.url', {
          headers: { test: 'whatever' },
        }),
      } as any);

      expect(got?.headers.get('test')).toEqual('whatever');
      expect(got?.headers.get('authorization')).toEqual('Bearer client_access_token');

      const got2 = await mw.onRequest({
        request: new Request('http://some.url', {
          headers: { test: 'whatever' },
        }),
      } as any);

      expect(got2?.headers.get('test')).toEqual('whatever');
      expect(got2?.headers.get('authorization')).toEqual('Bearer client_access_token');

      // should only be called 1x b/c the first call sets the access token and it is not expired.
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const req = mockFetch.mock.calls[0][0];
      expect(req.url).toEqual('http://base.url/token');
      expect(req.headers.get('authorization')).toEqual('Basic MTIzOnNoaGg=');
      expect(req.headers.get('content-type')).toEqual('application/x-www-form-urlencoded');
      expect(await req.text()).toEqual(`grant_type=client_credentials`);
    }
  });

  it('gets access token and requests a new one if expired.', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        HttpResponse.json(
          {
            access_token: 'access_token_one',
            refresh_token: 'refresh_token_one',
            expires_in: 0,
          },
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        HttpResponse.json(
          {
            access_token: 'access_token_two',
            refresh_token: 'refresh_token_two',
            expires_in: 0,
          },
          { status: 200 },
        ),
      );

    const mw = authMiddleware({
      baseUrl: 'http://base.url',
      fetch: mockFetch,
      auth: {
        _type: 'client_credentials',
        client_id: '123',
        client_secret: 'shhh',
      },
    });

    expect(mw.onRequest).toBeDefined();

    if (mw.onRequest) {
      const got = await mw.onRequest({
        request: new Request('http://some.url', {
          headers: { test: 'whatever' },
        }),
      } as any);

      expect(got?.headers.get('test')).toEqual('whatever');
      expect(got?.headers.get('authorization')).toEqual('Bearer access_token_one');

      const got2 = await mw.onRequest({
        request: new Request('http://some.url', {
          headers: { test: 'whatever' },
        }),
      } as any);

      expect(got2?.headers.get('test')).toEqual('whatever');
      expect(got2?.headers.get('authorization')).toEqual('Bearer access_token_two');

      // initial call gets access token.
      expect(mockFetch).toHaveBeenCalledTimes(2);

      const req0 = mockFetch.mock.calls[0][0];
      expect(req0.headers.get('authorization')).toEqual('Basic MTIzOnNoaGg=');
      expect(req0.headers.get('content-type')).toEqual('application/x-www-form-urlencoded');
      expect(await req0.text()).toEqual('grant_type=client_credentials');

      // next call to refresh token since it is expired.
      const req1 = mockFetch.mock.calls[1][0];
      expect(req1.url).toEqual('http://base.url/token');
      expect(req1.headers.get('content-type')).toEqual('application/x-www-form-urlencoded');
      expect(await req1.text()).toEqual('grant_type=refresh_token&refresh_token=refresh_token_one');
    }
  });
});
