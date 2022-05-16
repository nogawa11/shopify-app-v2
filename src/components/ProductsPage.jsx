import { useState, useCallback } from "react";
import {
  Layout,
  Banner,
  Card,
  ResourceList,
  TextStyle,
  TextField,
  Stack,
  Thumbnail,
  Button,
} from "@shopify/polaris";
import { Toast, Loading } from "@shopify/app-bridge-react";
import { gql, useQuery, useMutation } from "@apollo/client";

const GET_PRODUCTS_BY_ID = gql`
  query getProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        title
        handle
        descriptionHtml
        id
        images(first: 1) {
          edges {
            node {
              id
              originalSrc
              altText
            }
          }
        }
        variants(first: 1) {
          edges {
            node {
              price
              id
            }
          }
        }
      }
    }
  }
`;

const UPDATE_PRICE = gql`
  mutation productVariantUpdate($input: ProductVariantInput!) {
    productVariantUpdate(input: $input) {
      product {
        title
      }
      productVariant {
        id
        price
      }
    }
  }
`;

export function ProductsPage({ productIds }) {
  const { loading, error, data } = useQuery(GET_PRODUCTS_BY_ID, {
    variables: { ids: productIds },
  });
  const [newPriceArray, setNewPriceArray]= useState([]);
  const [mutateFunction] = useMutation(UPDATE_PRICE);

  const [toastState, setToastState] = useState(false);
  const toastMarkup = toastState && (
    <Toast
      content="Price has been updated!"
      onDismiss={() => setToastState(false)}
    />
  );

  const updatePrice = (event) => {
    event.preventDefault();
    let unique = [...new Set(newPriceArray)]
      unique.forEach((item) => {
        mutateFunction({
          variables: { input: item },
        })
      })
    setToastState(true)
  }

  if (loading) return <Loading />;
  if (error) {
    console.warn(error);
    return (
      <Banner status="critical">There was an issue loading products.</Banner>
    );
  }

  return (
    <>
      {toastMarkup}
      <Layout>
        <Layout.Section>
          <Card>
            <ResourceList
              showHeader
              resourceName={{ singular: "Product", plural: "Products" }}
              items={data.nodes}
              renderItem={(item) => {
                const media = (
                  <Thumbnail
                    source={
                      item.images.edges[0]
                        ? item.images.edges[0].node.originalSrc
                        : ""
                    }
                    alt={
                      item.images.edges[0]
                        ? item.images.edges[0].node.altText
                        : ""
                    }
                  />
                );
                const id = item.variants.edges[0].node.id
                const price = item.variants.edges[0].node.price;
                const [value, setValue] = useState(price);
                let productVariableInput = {
                  id: item.variants.edges[0].node.id,
                  price: Number(value),
                }
                const handleChange = useCallback((newValue) => {
                  setValue(newValue);
                  productVariableInput.price = newValue
                  updateProductVariable()
                }, []);

                const updateProductVariable = () => {
                  if (newPriceArray.some(e => e.id === id)) {
                    const newArrayValues = newPriceArray.forEach((i) => {
                      if (i.id === id) {
                        item = productVariableInput
                      } else {
                        item = item
                      }
                    })
                    setNewPriceArray(newArrayValues)
                  } else {
                    setNewPriceArray((prevState) => ([...prevState, productVariableInput]));
                  }
                }

                return (
                  <ResourceList.Item
                    id={item.id}
                    media={media}
                    accessibilityLabel={`View details for ${item.title}`}
                  >
                    <Stack>
                      <Stack.Item fill>
                        <h3>
                          <TextStyle variation="strong">{item.title}</TextStyle>
                        </h3>
                      </Stack.Item>
                      <Stack.Item>
                        <TextField
                          label="Set new price (JPY)"
                          name="priceChanger"
                          type="number"
                          onChange={handleChange}
                          prefix="¥"
                          value={value}
                          min="0"
                        />
                      </Stack.Item>
                    </Stack>
                  </ResourceList.Item>
                );
              }}
            />
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Button primary fullWidth={true} onClick={updatePrice}>
            Save
          </Button>
        </Layout.Section>
      </Layout>
    </>
  );
}
