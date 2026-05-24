// No external auth routes needed — auth is handled via admins/sessions tables.
import { httpRouter } from "convex/server";

const http = httpRouter();

export default http;
