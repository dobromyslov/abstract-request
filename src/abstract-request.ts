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
   * Converts nested object to plain query params for further feeding to URL.searchParams.append.
   *
   * @param nestedParams nested objects representing query params
   * @param prefix [OPTIONAL] name of the root param.
   */
  public static convertNestedQueryParamsToPlainObject(nestedParams: {[key: string]: any}, prefix = ''): {[key: string]: any} {
    const result: {[key: string]: any} = {};
    for (const key in nestedParams) {
      if (Object.prototype.hasOwnProperty.call(nestedParams, key)) {
        let plainParamName = key;
        if (prefix) {
          plainParamName = prefix + '[' + plainParamName + ']';
        }

        if (typeof nestedParams[key] === 'object') {
          Object.assign(result, this.convertNestedQueryParamsToPlainObject(nestedParams[key], plainParamName));
        } else {
          result[plainParamName] = nestedParams[key];
        }
      }
    }

    return result;
  }

  public async execute(): Promise<T> {
    const url = this.getUrlWithParams();
    console.log('Requesting URL: ' + url.toString());

    let body;
    if (this.form) {
      if (this.json) {
        throw new Error('Can not simultaneously send form and json in one request.');
      }

      body = new URLSearchParams();
      const plainFormParams = AbstractRequest.convertNestedQueryParamsToPlainObject(this.form);
      for (const key in plainFormParams) {
        if (Object.prototype.hasOwnProperty.call(plainFormParams, key)) {
          body.append(key, plainFormParams[key]);
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
      agent: this.proxyUrl ? new HttpsProxyAgent(this.proxyUrl): undefined
    }).then(async response => this.processResponse(response));
  }

  public getUrl(): URL {
    return new URL(this.baseUrl);
  }

  public getUrlWithParams(): URL {
    const url = this.getUrl();

    const plainQueryParams = AbstractRequest.convertNestedQueryParamsToPlainObject(this.queryParams);
    for (const key in plainQueryParams) {
      if (Object.prototype.hasOwnProperty.call(plainQueryParams, key)) {
        url.searchParams.append(key, plainQueryParams[key]);
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

  protected abstract async processResponse(response: Response): Promise<T>;
}
