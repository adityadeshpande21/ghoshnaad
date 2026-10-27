// CSS, HTML and Markdown files imported by screens are bundled as text.
declare module '*.css' { const text: string; export default text; }
declare module '*.html' { const text: string; export default text; }
declare module '*.md' { const text: string; export default text; }
// built from languages.json by build/lib/languages.mjs
declare module 'virtual:languages/messages' { const messages: Record<string, Record<string, string>>; export default messages; }
declare module 'virtual:languages/names' { const names: Record<string, Record<string, string>>; export default names; }
declare module 'virtual:languages/content' { const content: Record<string, Record<string, string>>; export default content; }
