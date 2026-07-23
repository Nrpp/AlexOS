# AlexOS Coding Guidelines

Version: 1.0

Status: Official

---

# Philosophy

Code is read far more often than it is written.

Always optimize for readability.

Never optimize for fewer lines.

Never write clever code.

Write obvious code.

---

# General Rules

Keep files small.

Keep functions focused.

Keep components reusable.

Never duplicate logic.

Never hardcode values.

Never ignore TypeScript errors.

---

# Naming

Variables

camelCase

Functions

camelCase

React Components

PascalCase

Hooks

useSomething

Constants

UPPER_CASE

Folders

kebab-case

Files

PascalCase for components.

camelCase for utilities.

---

# Components

Every component has one responsibility.

Never create giant components.

Maximum recommended size

250 lines.

Split when needed.

---

# React

Use Functional Components only.

Use Hooks.

No Class Components.

Prefer composition over inheritance.

---

# State

Local state first.

Context only when necessary.

Global state only if absolutely required.

---

# Styling

TailwindCSS only.

Never inline styles.

Never duplicate utility classes.

Extract reusable UI.

---

# API

REST first.

WebSockets for real-time features.

Consistent endpoints.

Meaningful responses.

---

# Backend

FastAPI.

One responsibility per file.

Business logic separated from routes.

No giant API files.

---

# Errors

Always handle errors.

Never crash silently.

Provide friendly messages.

Log technical details.

---

# Logging

Every important action should be logged.

Use structured logs.

Never print random debug messages.

---

# Configuration

Everything configurable.

Nothing hardcoded.

Environment variables for secrets.

---

# Performance

Lazy load where possible.

Avoid unnecessary renders.

Memoize only when beneficial.

Measure before optimizing.

---

# Git

One feature per branch.

Small commits.

Meaningful commit messages.

No "fix".

No "update".

Good:

Add Dock animations

Bad:

changes

---

# Documentation

Every exported function should be documented.

Complex logic must explain why.

Not what.

---

# Comments

Avoid comments explaining obvious code.

Explain decisions.

Not syntax.

---

# Testing

Future support.

Architecture should allow tests.

---

# Security

Never expose secrets.

Never trust user input.

Validate everything.

---

# UI

Every screen must respect the Design System.

Never invent new styles.

---

# Modules

Every module must be isolated.

No direct dependency between modules.

Communication happens through the Core.

---

# Pull Requests

Every PR should answer:

Why?

What changed?

How was it tested?

---

# Golden Rule

If the code is difficult to understand after six months...

Rewrite it.
