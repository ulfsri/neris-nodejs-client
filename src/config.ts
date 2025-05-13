export type NerisAuthentication =
  | {
      _type: 'password';
      username: string;
      password: string;
    }
  | {
      _type: 'client_credentials';
      client_id: string;
      client_secret: string;
    }
  | {
      _type: 'access_token';
      access_token: string;
    };

export interface NerisApiConfig {
  baseUrl: string;
  fetch?: (input: Request) => Promise<Response>;
  auth: NerisAuthentication;
}
