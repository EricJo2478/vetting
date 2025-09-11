src/
├── assets/ # static images, icons
├── components/ # reusable UI components (pure, no business logic)
│ ├── auth/ # login, signup, etc.
│ ├── vetting/ # cards, steps, badges
│ └── common/ # NavBar, ModalButton, etc.
├── contexts/ # React Contexts (AuthContext, RoleContext)
├── hooks/ # custom hooks (useAuth, useProgress)
├── pages/ # route-level components (Dashboard, LoginPage)
├── services/ # Firebase setup & API wrappers
│ ├── firebase.ts
│ ├── userService.ts
│ ├── roleService.ts
│ └── progressService.ts
├── types/ # TypeScript interfaces (UserDoc, RoleDoc, etc.)
├── utils/ # date helpers, formatting, constants
├── main.tsx # entry point
├── App.tsx # top-level app / router
└── main.css
