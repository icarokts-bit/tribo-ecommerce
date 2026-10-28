const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

// Inicializa o Admin SDK com a sintaxe nova
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function popularBanco() {
  // Definimos um ID de loja e um slug (link) padrão para teste
  const storeId = "loja-teste-01";
  const slug = "loja3d"; 

  try {
    console.log("⏳ Iniciando criação das coleções no Firestore...");

    // 1. Cria o documento de busca do lojista (necessário para o :slug na URL)
    await db.collection("usuarios").doc(storeId).set({
      menuLink: slug,
      createdAt: FieldValue.serverTimestamp() // Sintaxe atualizada para o Timestamp
    });

    // 2. Configurações base (Nome da loja, Horários ativos 24h para teste)
    await db.doc(`artifacts/tribo-burger-financeiro/users/${storeId}/cmv_data/state`).set({
      menuLink: slug,
      companyName: "E-commerce 3D Teste",
      geral_entregas: true,
      geral_retirada: true,
      horarios: [0, 1, 2, 3, 4, 5, 6].map(dia => ({ dia, ativo: true, abertura: "00:00", fechamento: "23:59" }))
    }, { merge: true });

    // 3. Catálogo (Criação do Totem com Variáveis, Peso e SKU)
    await db.doc(`artifacts/tribo-burger-financeiro/users/${storeId}/delivery/catalog_state`).set({
      products: [
        {
          id: "prod_001",
          sku: "TOTEM-NFC-01",
          name: "Totem de Mesa PIX + NFC",
          description: "Display em PLA para balcão com tecnologia de aproximação (NFC) inclusa.",
          price: 89.90,
          promoPrice: 79.90,
          isPromo: true,
          category: "Displays",
          imageUrl: "", // Deixe vazio ou coloque uma URL temporária
          isActive: true,
          destaque: true,
          weight: 0.150, // 150 gramas
          dimensions: { length: 15, width: 10, height: 20 }, // em cm
          variations: [
            { name: "Cor", options: ["Preto", "Branco", "Cinza Metálico"] }
          ]
        }
      ]
    });

    // 4. Logística (Áreas ou Regiões)
    await db.doc(`artifacts/tribo-burger-financeiro/users/${storeId}/delivery_settings/areas`).set({
      configGeral: { cidadePadrao: "São Paulo, SP" },
      regioes: [{ km: 9999, deliveryFee: 25, time: "Sedex (Correios)", isInactive: false }],
      bairros: []
    });

    // 5. Pagamentos
    await db.doc(`artifacts/tribo-burger-financeiro/users/${storeId}/settings/paymentMethods`).set({
      methods: [
        { id: "pix", name: "Pix", showOnMenu: true },
        { id: "credit", name: "Cartão de Crédito", showOnMenu: true }
      ]
    });

    console.log("✅ Banco de dados populado com sucesso!");
    console.log(`🚀 Acesse o link do Vercel adicionando /${slug} no final da URL.`);
    process.exit(0);

  } catch (error) {
    console.error("❌ Erro ao criar dados:", error);
    process.exit(1);
  }
}

popularBanco();