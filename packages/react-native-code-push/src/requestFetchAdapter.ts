import { Callback, Http } from "./core/acquisition-sdk";

const packageJson = require("../../package.json");

async function doRequest(
  verb: Http.Verb,
  url: string,
  requestBody: string | undefined,
  callback: Callback<Http.Response>
): Promise<void> {
  const headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "X-CodePush-Plugin-Name": packageJson.name,
    "X-CodePush-Plugin-Version": packageJson.version,
    "X-CodePush-SDK-Version": packageJson.dependencies["code-push"]
  };

  if (requestBody && typeof requestBody === "object") {
    requestBody = JSON.stringify(requestBody);
  }

  try {
    const response = await fetch(url, {
      method: verb,
      headers: headers,
      body: requestBody
    });

    const statusCode = response.status;
    const body = await response.text();
    callback(undefined, { statusCode, body });
  } catch (err) {
    callback(err);
  }
}

function request(
  verb: Http.Verb,
  url: string,
  requestBodyOrCallback: string | Callback<Http.Response>,
  callback?: Callback<Http.Response>
): void {
  if (typeof requestBodyOrCallback === "function") {
    doRequest(verb, url, undefined, requestBodyOrCallback);
  } else if (callback) {
    doRequest(verb, url, requestBodyOrCallback, callback);
  }
}

export default { request }