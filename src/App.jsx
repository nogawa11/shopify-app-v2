import {
  ApolloClient,
  ApolloProvider,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";
import {
  Provider as AppBridgeProvider,
  useAppBridge,
  ResourcePicker,
  TitleBar,
} from "@shopify/app-bridge-react";
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Redirect } from "@shopify/app-bridge/actions";
import { AppProvider as PolarisProvider, Page } from "@shopify/polaris";
import translations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";
import { EmptyStatePage } from "./components/EmptyStatePage";
import { ProductsPage } from "./components/ProductsPage";
import { useState } from "react";

export default function App() {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState([]);
  const handleSelection = (resources) => {
    setSelection(resources.selection.map((product) => product.id));
    setOpen(false);
  };

  return (
    <PolarisProvider i18n={translations}>
      <AppBridgeProvider
        config={{
          apiKey: process.env.SHOPIFY_API_KEY,
          host: new URL(location).searchParams.get("host"),
          forceRedirect: true,
        }}
      >
        <MyProvider>
          <Page>
            {selection.length > 0 ? (
              <TitleBar
                primaryAction={{
                  content: "Select products",
                  onAction: () => setOpen(true),
                }}
              />
            ) : null}
            <ResourcePicker
              resourceType="Product"
              showVariants={false}
              open={open}
              onSelection={(resources) => handleSelection(resources)}
              onCancel={() => setOpen(false)}
            />
            {selection.length > 0 ? (
              <ProductsPage
                productIds={selection}
                setSelection={setSelection}
              />
            ) : (
              <EmptyStatePage setOpen={setOpen} />
            )}
          </Page>
        </MyProvider>
      </AppBridgeProvider>
    </PolarisProvider>
  );
}

function MyProvider({ children }) {
  const app = useAppBridge();

  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      credentials: "include",
      fetch: userLoggedInFetch(app),
    }),
  });

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

export function userLoggedInFetch(app) {
  const fetchFunction = authenticatedFetch(app);

  return async (uri, options) => {
    const response = await fetchFunction(uri, options);

    if (
      response.headers.get("X-Shopify-API-Request-Failure-Reauthorize") === "1"
    ) {
      const authUrlHeader = response.headers.get(
        "X-Shopify-API-Request-Failure-Reauthorize-Url"
      );

      const redirect = Redirect.create(app);
      redirect.dispatch(Redirect.Action.APP, authUrlHeader || `/auth`);
      return null;
    }

    return response;
  };
}
