import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApis } from "./baseApis";

export const store = configureStore({
  reducer: {
    [baseApis.reducerPath]: baseApis.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApis.middleware),
});

setupListeners(store.dispatch);
