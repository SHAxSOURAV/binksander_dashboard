import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./Routes/Routes.jsx";

import "./index.css";

import { Toaster } from "react-hot-toast";
import { ConfigProvider } from "antd";
import { Provider } from "react-redux";
import { store } from "./Redux/main/store.js";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#14149C",
          fontFamily: "Poppins, sans-serif",
          borderRadius: 10,
        },
      }}
    >
      <Provider store={store}>
        <RouterProvider router={router} />
        <Toaster position="top-center" reverseOrder={false} />
      </Provider>
    </ConfigProvider>
  </StrictMode>,
);
