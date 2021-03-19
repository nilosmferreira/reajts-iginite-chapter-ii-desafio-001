import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

// const KEYSTORAGE = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart'); //Buscar dados do localStorage

    if (storagedCart) {
      return JSON.parse(storagedCart);
    } else {
      localStorage.setItem('@RocketShoes:cart', '[]');
    }

    return [];
  });

  // useEffect(() => {
  //   localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
  // }, [cart]);

  const updateCartProduct = (newCarts: Product[]) => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCarts));

    setCart(newCarts);
  };
  const addProduct = async (productId: number) => {
    try {
      const cartIndex = cart.findIndex((cart) => cart.id === productId);
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      if (cartIndex === -1) {
        if (stock.amount > 0) {
          const { data: product } = await api.get<Product>(
            `/products/${productId}`
          );

          const newCarts = [...cart, { ...product, amount: 1 }];
          updateCartProduct(newCarts);
        } else {
        }
      } else {
        const productAmount = cart[cartIndex].amount + 1;

        if (stock.amount < productAmount) {
          toast.error('Quantidade solicitada fora de estoque');
        } else {
          const newCarts = cart.map((product) =>
            product.id === productId
              ? { ...product, amount: productAmount }
              : product
          );

          updateCartProduct(newCarts);
        }
      }
    } catch (error) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const filtred = cart.filter((product) => productId !== product.id);
      if (filtred.length === cart.length) {
        toast.error('Erro na remoção do produto');
      } else {
        updateCartProduct(filtred);
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);
      if (amount < 1) {
        return;
      } else if (amount < stock.amount) {
        const changedProducts = cart.map((p) => {
          if (productId === p.id) {
            p.amount = amount;
          }
          return p;
        });
        updateCartProduct(changedProducts);
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addProduct,
        removeProduct,
        updateProductAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
