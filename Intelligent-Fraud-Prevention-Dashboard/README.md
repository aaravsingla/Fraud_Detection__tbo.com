
  # Intelligent Fraud Prevention Dashboard

  ## Running the code

  Run `npm i` to install the dependencies.

  ### Start the synthetic Risk API (backend)

  In one terminal:

  - `npm run server`

  This starts a minimal Node HTTP server on `http://localhost:5179` with:

  - `POST /api/risk/score`
  - `POST /api/credit/recommend`
  - `POST /api/review/override`

  ### Start the frontend

  In another terminal:

  - `npm run dev`

  The Vite dev server proxies `/api/*` requests to `http://localhost:5179`.
  