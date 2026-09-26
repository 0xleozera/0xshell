// Dotfiles under src/dotfiles are imported `with { type: 'text' }`, which
// makes Bun embed them in the compiled binary as plain strings (ADR-0006).
declare module '*.zsh' {
  const content: string;
  export default content;
}

declare module '*.zsh-theme' {
  const content: string;
  export default content;
}

declare module '*.lua' {
  const content: string;
  export default content;
}
