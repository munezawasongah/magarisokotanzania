/** Error with an HTTP status, thrown by server modules and mapped to responses by routes/actions. */
export class ListingError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
