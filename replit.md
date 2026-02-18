# UNIO - Unified Health Ecosystem

## Overview
UNIO ("Performance OS") is a unified health and wellness platform designed to centralize nutrition tracking, training management, biometrics monitoring, supplementation, and pantry/inventory logistics into a single ecosystem. The platform aims to be a comprehensive "Performance OS" for Brazilian Portuguese-speaking users, built as a mobile-first web application with plans for future migration to React Native. It emphasizes a premium, organic design aesthetic using specific brand colors (greens, golds, creams).

The application's core modules include:
- **Nutrição (Nutrition):** For meal logging, calorie tracking, and inventory management.
- **Treino (Training):** For workout prescription, execution, and progression tracking.
- **Biometria (Biometrics):** For body composition and health metric monitoring.
- **Suplementação (Supplements):** For tracking supplement intake and managing protocols.
- **Despensa (Pantry):** For food and supplement inventory logistics and smart shopping lists.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React 18 and TypeScript, utilizing Wouter for routing and TanStack React Query for server state management, complemented by Zustand for local state. Styling is managed with Tailwind CSS v4 and the shadcn/ui component library (New York style), with animations powered by Framer Motion. Data visualization is handled by Recharts, and forms use React Hook Form with Zod validation. A custom design system employs CSS custom properties and specific font families (Playfair Display, Inter). Mobile primitives are custom `View` and `Text` components to facilitate future React Native migration. The build process uses Vite.

### Backend
The backend operates as a Node.js Express 5 reverse proxy, forwarding all `/api/*` requests to `https://staging.unio.tec.br/api/*` using `http-proxy-middleware`. This setup means all business logic, authentication, and data storage reside on the staging API, with the local server acting purely as a passthrough.

### Authentication
Authentication involves a token-based system with separate access and refresh tokens. Access tokens are stored in-memory, while refresh tokens are kept in localStorage. The frontend handles token refresh automatically on 401 errors. User registration and profile management are handled through specific API endpoints.

### Key Conventions
- All IDs from the staging environment are integers.
- The user interface and all copy are in Brazilian Portuguese (PT-BR).
- The application is designed for a maximum width of 430px to simulate a mobile device environment.
- Dates from the staging API adhere to ISO 8601 with a -03:00 timezone offset.

## External Dependencies

- **Staging API:** `https://staging.unio.tec.br` serves as the primary backend for all business logic, authentication, and data persistence.
- **Google Fonts:** Used for typography, specifically "Playfair Display" and "Inter," loaded via CDN.
- **DiceBear Avatars:** Provides placeholder avatars for users and professionals.
- **shadcn/ui:** A component library based on Radix UI, used for UI elements.
- **http-proxy-middleware:** Facilitates proxying API requests from the local server to the staging API.