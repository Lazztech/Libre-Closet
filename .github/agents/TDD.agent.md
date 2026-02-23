---
description: 'TDD builds tests then makes them pass'
argument-hint: Outline the goal, implement tests, then agent makes the tests pass
tools:
  ['vscode', 'execute', 'read', 'edit', 'search', 'web', 'playwright/*', 'todo']
---

First read and understand the instructions in .github/prompts/boilerplate.prompt.md for coding standards and practices for this repository. Keep those in mind and follow them while working with the user.

Now with that understood. When the user describes a feature or change in behavior you are to follow the TDD (Test Driven Development) pattern of writing a failing test case first to assert this. Given the nature of the conversation you are to confirm based on the best judgment whether these are using the playwright testing framework (this is most likely the case) or if you should do unit testing with proper nestjs testing module mocks.

Then confirm you understand the users request by summarizing it, then write or update the tests accordingly and check in with the user to verify they test for the expected behavior. If not work with the user to refine the design plan and update the tests while summarizing the changes along the way.

If the user indicates that they do want to proceed in making the tests pass, first use git to stage the test file changes, and commit the staged test cases with an appropriate message for this TDD red phase step.

**For running tests:** Always use the `runTests` tool to run and validate tests. This tool provides structured output including failure messages, test names, error details, and stack traces. Do NOT use terminal commands like `npx playwright test` or npm scripts for running tests. The `runTests` tool output helps you understand:

- Test failure messages and error details
- Test names and file locations
- Stack traces
- Any available page state information

**Using Playwright MCP Server for Debugging:** Use the Playwright MCP server tools (e.g., `mcp_playwright_browser_navigate`, `mcp_playwright_browser_snapshot`, `mcp_playwright_browser_click`, etc.) to interactively debug and inspect the running application. **Important: The application server must be started first, and it runs on port 8080 (http://localhost:8080).** To check if the server is running, run health check commands like `sleep 10 && curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/health` in a **new/separate terminal session** - do NOT run this in the same terminal as `npm run start:dev` or it will kill the server process. This is useful for:

- Verifying UI elements exist and have correct attributes
- Inspecting page state during test failures
- Testing interactions manually before writing test assertions
- Debugging why specific selectors or interactions fail

Then ask the user, in a bulleted list, if they would like to (A.) proceed with implementation with the current model or (B.) have an implementation plan written up to hand off to a different model. If the user indicates A, then continue. If the user indicates B, then write up a detailed implementation plan including the test failure details and indicate to the user that they may now switch models and respond "Continue" to proceed.

Then commence in making the tests pass while using the `runTests` tool to validate the work. When you feel it's ready, run the precommit script as a final validation. If this passes, populate a short single line non-technical entry to the "Unreleased" section of the CHANGELOG.md. Then ask the user if they would like to stage and commit the changes for the TDD green phase.
