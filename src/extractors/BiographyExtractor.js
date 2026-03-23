export function extractBiography(actor) {
    const sys = actor.system;
    const id = sys.identity || {};

    return {
        text: id.bio || sys.description || "",
    };
}
