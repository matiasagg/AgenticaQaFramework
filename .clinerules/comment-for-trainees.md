## Brief overview
  Esta regla establece que el código debe estar comentado de manera clara y didáctica para que desarrolladores trainee puedan entender fácilmente la lógica, el propósito y el flujo del código.

## Principios de comentado
  - **Claridad sobre brevedad**: Los comentarios deben explicar el "por qué" y no solo el "qué", prefiriendo claridad sobre concisión.
  - **Lenguaje simple**: Usar un lenguaje sencillo y directo, evitando jerga técnica innecesaria.
  - **Ejemplos prácticos**: Incluir ejemplos cuando sea posible para ilustrar el uso o comportamiento esperado.

## Qué comentar
  - **Funciones y métodos**: Propósito, parámetros, valor de retorno y casos de uso.
  - **Lógica compleja**: Algoritmos, condiciones complejas o flujos de control no obvios.
  - **Decisiones de diseño**: Razones detrás de enfoques específicos o soluciones alternativas consideradas.
  - **Integraciones externas**: APIs, servicios third-party, dependencias y su configuración.
  - **Tests**: Propósito del test, escenario que cubre y resultado esperado.

## Formato de comentarios
  - **Funciones**: Usar JSDoc/TypeScript doc comments con @param, @returns, @example
  - **Líneas específicas**: Comentarios inline cortos (máximo 1 línea) para lógica no obvia
  - **Bloques de código**: Comentarios multilínea para explicar flujos complejos
  - **TODO/FIXME**: Indicar áreas que requieren mejora o atención futura

## Qué evitar
  - No comentar lo obvio (ej: "incrementa i en 1" para i++)
  - No duplicar lo que el código ya expresa claramente
  - No dejar comentarios obsoletos o incorrectos
  - No usar humor o referencias confusas

## Ejemplo de buen comentado
  ```typescript
  /**
   * Calcula el descuento aplicable al carrito de compras.
   * Aplica descuento por volumen (> $1000) y por cliente recurrente.
   * 
   * @param cart - Carrito con items y subtotal
   * @param customer - Cliente con historial de compras
   * @returns Porcentaje de descuento (0-50)
   * 
   * @example
   * // Cliente recurrente con compra > $1000
   * calculateDiscount(cart, customer) // retorna 15
   */
  function calculateDiscount(cart: Cart, customer: Customer): number {
    // Verificar elegibilidad para descuento por volumen
    const volumeDiscount = cart.subtotal > 1000 ? 10 : 0;
    
    // Descuento adicional para clientes recurrentes (> 5 compras)
    const loyaltyDiscount = customer.purchaseHistory.length > 5 ? 5 : 0;
    
    // Sumar descuentos, máximo 50%
    return Math.min(volumeDiscount + loyaltyDiscount, 50);
  }