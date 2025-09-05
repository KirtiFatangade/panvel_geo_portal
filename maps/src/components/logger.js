// import log from 'loglevel';
import { HOST } from "./host";
import { GlobalContext } from "../App";

import loglevel from "loglevel";

const log = loglevel.getLogger("logger");
log.setLevel("info"); // Set default log level

async function logToServer(level, message) {
  fetch(`${HOST}/log/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ level, message }),
  })
    .then((response) => {
      if (!response.ok) {
        console.error("Failed to send log message to server");
      }
    })
    .catch((error) => {
      console.error("Error sending log message to server:", error);
    });
}

export default log;
export { logToServer };
