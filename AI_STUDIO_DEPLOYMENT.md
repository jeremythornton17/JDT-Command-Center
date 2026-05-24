# AI Studio Deployment Source

Use this repository branch for Google AI Studio publishing:

- Repository: `jeremythornton17/JDT-Command-Center`
- Branch: `ai-studio-deploy`

Before publishing from AI Studio, confirm the source includes:

- `server.js`
- `src/treeRelocationMap.ts`
- `src/components/MapsBoard.tsx`
- `package.json` with `"start": "node server.js"`

Do not publish or sync an AI Studio draft that deletes `server.js` or `src/treeRelocationMap.ts`.
Do not publish a draft that asks for Verizon or Michelin fleet provider credentials.
