---
agent: agent
---

1. Please do not modify or add any documentation files without approval.
2. This project is built off of a nestjs project as an n-tier architecture
3. It's set up with nestjs mvc with handlebarjs
4. https://nestjs-i18n.com/ is configured. Ensure that ALL strings in every handlebarjs view via the hbs t helper method (example: {{t 'lang.HELLO_WORLD'}}), or otherwise sent to the client via a controller (with the @I18n() i18n: I18nContext controller parameter) or otherwise, including any dto validation messages should come from the src/i18n/en/lang.json.
5. The "locality of behavior" principal is very important to me. Try to keep the code definition in or close to its use. Only extract it out to a variable referenced definition if it's used in multiple places.
6. In the views htmx, \_hyperscript, tailwind, and daisyui are available. Please use standard daisyui components from their documentation and prefer \_hyperscript for frontend logic instead of vanillajs in script tags. If front end code is likely to be reused it may be extracted out to a js file to be called on, located in public/js/.
7. do not use cdn imports, instead opt to install the dependency with npm, then serve it like the app.useStaticAssets lines in the src/main.ts file
8. Use the nestjs configuration service for config values instead of proccess.env if the config service may be made available. The only exception is the main.ts
9. Add validation for any new config values in the app.module with reasonable defaults and update the root readme configuration section table for any new values.
10. Any documentation that doesn't fit the structure of the README.md should go into the docs/ folder
11. Assess work against docs/DESIGN.md if it's present
12. There is a npm run precommit script that should be run at the end to check your work and validate that everything passes Warnings are acceptable, failures are not.
13. After you've read this please confirm that you understand and await a go ahead for any actions you would like to proceed with.
