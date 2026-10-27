// CSS and HTML files imported by screens are bundled as text.
declare module '*.css' { const text: string; export default text; }
declare module '*.html' { const text: string; export default text; }
