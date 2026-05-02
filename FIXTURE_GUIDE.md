# Fixture Guide

Golden fixtures live in `fixtures/` and are exercised by the test suite.

Capture a local fixture:

```bash
openrender fixture capture --name sample-dot --from sprite.png --target canvas --id fixture.dot --json
```

Fixture capture writes sanitized fixture metadata and refuses files outside the project root. Do not include private project files, credentials, generated assets, or local reports in public fixture contributions.

Each adapter should keep at least two golden fixtures before being considered ready for broader use.
