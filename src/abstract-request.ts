import fetch, {Response} from 'node-fetch';
import {URL, URLSearchParams} from 'url';
import AbortController from 'abort-controller/dist/abort-controller';
import HttpsProxyAgent from 'https-proxy-agent/dist/agent';

export abstract class AbstractRequest<T> {
  /**
   * Any nested object to be transferred during POST|PUT request as application/x-www-form-urlencoded.
   */
  public form?: {[key: string]: any};

  /**
   * Any nested object to be transferred during POST|PUT request as application/json.
   */
  public json?: {[key: string]: any};

  /**
   * Base URL to send request to.
   */
  protected baseUrl = '';

  /**
   * Cookie header string.
   */
  protected cookie?: string;

  /**
   * User agent header string.
   */
  protected userAgent?: string;

  /**
   * HTTP request headers.
   */
  protected headers?: {[key: string]: string};

  /**
   * Proxy URL.
   * e.g. http://127.0.0.1:8080
   */
  protected proxyUrl?: string;

  /**
   * Query params to be used in URL.searchParams.
   */
  protected queryParams: {[key: string]: any} = {};

  /**
   * Controller to abort requests.
   */
  private readonly abortController = new AbortController();

  /**
   * HTTP protocol method.
   */
  protected abstract httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';

  /**
   * Converts nested object to plain query parameters for further feeding to URL.searchParams.append.
   *
   * @param nestedParameters nested objects representing query parameters
   * @param prefix [OPTIONAL] name of the root parameter.
   */
  public static convertNestedQueryParametersToPlainObject(nestedParameters: {[key: string]: any}, prefix = ''): {[key: string]: any} {
    const result: {[key: string]: any} = {};
    for (const key in nestedParameters) {
      if (Object.prototype.hasOwnProperty.call(nestedParameters, key)) {
        let plainParameterName = key;
        if (prefix) {
          plainParameterName = prefix + '[' + plainParameterName + ']';
        }

        if (typeof nestedParameters[key] === 'object') {
          Object.assign(result, this.convertNestedQueryParametersToPlainObject(nestedParameters[key], plainParameterName));
        } else {
          result[plainParameterName] = nestedParameters[key];
        }
      }
    }

    return result;
  }

  public async execute(): Promise<T> {
    const url = this.getUrlWithParameters();
    console.log('Requesting URL: ' + url.toString());

    let body;
    if (this.form) {
      if (this.json) {
        throw new Error('Can not simultaneously send form and json in one request.');
      }

      body = new URLSearchParams();
      const plainFormParameters = AbstractRequest.convertNestedQueryParametersToPlainObject(this.form);
      for (const key in plainFormParameters) {
        if (Object.prototype.hasOwnProperty.call(plainFormParameters, key)) {
          body.append(key, plainFormParameters[key]);
        }
      }
    }

    if (this.json) {
      body = JSON.stringify(this.json);
    }

    const headers: {[key: string]: string} = this.headers ?? {};
    if (this.json) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.cookie) {
      headers.Cookie = this.cookie;
    }

    if (this.userAgent) {
      headers['User-Agent'] = this.userAgent;
    }

    return fetch(url, {
      method: this.httpMethod,
      body,
      headers,
      signal: this.abortController.signal,
      agent: this.proxyUrl ? new HttpsProxyAgent(this.proxyUrl) : undefined
    }).then(async response => this.processResponse(response));
  }

  public getUrl(): URL {
    return new URL(this.baseUrl);
  }

  public getUrlWithParameters(): URL {
    const url = this.getUrl();

    const plainQueryParameters = AbstractRequest.convertNestedQueryParametersToPlainObject(this.queryParams);
    for (const key in plainQueryParameters) {
      if (Object.prototype.hasOwnProperty.call(plainQueryParameters, key)) {
        url.searchParams.append(key, plainQueryParameters[key]);
      }
    }

    return url;
  }

  /**
   * Sets HTTP headers.
   * @param headers
   */
  public setHeaders(headers: {[key: string]: string}): AbstractRequest<T> {
    this.headers = headers;
    return this;
  }

  /**
   * Sets Proxy Server URL.
   * e.g. http://127.0.0.1:8080
   */
  public setProxyUrl(proxyUrl: string): AbstractRequest<T> {
    this.proxyUrl = proxyUrl;
    return this;
  }

  /**
   * Aborts request.
   * Request ends with error when aborted.
   */
  public abort(): void {
    this.abortController.abort();
  }

  protected abstract async processResponse (response: Response): Promise<T>;
}
