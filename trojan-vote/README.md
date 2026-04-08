
```markdown
# Campus Vote: VSU Election Platform

**Course:** Software Design & Development  
**Professor:** Dr. Muhammad Haris Rais  
**Due Date:** April 3, 2026  

---

## 📖 Problem Definition

Virginia State University (VSU) students currently lack a centralized, digital platform to engage with campus elections. There is no unified system that allows students to transparently access candidate information, securely cast votes, or view real-time election results remotely. 

This gap leads to:
* Low voter participation.
* Limited candidate visibility.
* Restricted access to outcomes for students who cannot be physically present during announcements. 

**Campus Vote** aims to bridge this gap by providing a secure, accessible, and transparent campus election platform to modernize student governance and increase democratic engagement at VSU.

---

## ✨ Scope & Features

### Functional Features
* **Student Verification:** Secure authentication to ensure only eligible VSU students can vote.
* **Secure Login/Logout:** Protected user sessions.
* **Voting:** The core mechanism allowing students to cast their ballots securely.
* **User Roles:** Distinct permissions and access levels for *Admins*, *Students*, and *Developers*.
* **Profile Management:** Individual dashboards and settings for users.
* **Results Tracker:** An exclusive admin view to monitor incoming votes and election integrity.
* **Data Visualization:** Real-time charts and graphs to display election data and results clearly.

### Non-Functional Features
* **Mobile Friendly:** A responsive design ensuring seamless access and usability across smartphones, tablets, and desktop devices.

---

## 🔄 Methodology

The Campus Vote development team utilizes the **Agile methodology** for our project deliverables. We believe that an Agile approach allows us to consistently iterate and test features of the application as they are actively being implemented. 

**Our Primary Goal:** To deliver a Minimum Viable Product (MVP) within a **~4-week timeline**, utilizing Agile sprints to build, verify, and ship features quickly and efficiently.

---

## 🤝 Team Collaboration

| Team Member | Role | Responsibilities |
| :--- | :--- | :--- |
| **NeVaeh Dabney-Rich** | Project Manager & Documentation | Oversees project timelines, coordinates team tasks, tracks progress toward deadlines, and maintains project documents such as reports, meeting notes, and requirement specs. |
| **Jordan Daniels** | Developer & Tester | Builds and codes features for the application; tests the software to find and report bugs, ensuring the system works as intended before release. |
| **Adeiyi Olajide** | Developer | Builds and codes features for the application, collaborating with Jordan on implementation and contributing to the overall technical development of the platform. |
| **Kyra Evans** | Scrum Master & Project Manager | Facilitates Agile/Scrum ceremonies (sprint planning, standups, retrospectives), removes blockers for the team, and assists with project coordination alongside NeVaeh. |
| **Munso Bwalya** | Documentation | Creates and organizes project documentation, including user guides, technical specs, meeting minutes, and any written deliverables needed throughout the project. |
```# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
