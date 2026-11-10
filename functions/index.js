const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

// Substitua as duas linhas antigas por estas:
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

exports.vincularDominio = functions.https.onCall(async (data, context) => {
    // 1. Bloqueia acessos não autorizados
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Precisa estar logado para vincular domínios.");
    }

    const { dominio } = data;
    if (!dominio) {
        throw new functions.https.HttpsError("invalid-argument", "O domínio é obrigatório.");
    }

    try {
        // 2. Chama a API da Vercel para adicionar o domínio ao projeto
        const response = await axios.post(
            `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`,
            { name: dominio },
            {
                headers: {
                    Authorization: `Bearer ${VERCEL_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        // 3. Salva no banco de dados do utilizador que o domínio foi registado na Vercel
        await admin.firestore().doc(`artifacts/tribo-burger-financeiro/users/${context.auth.uid}/settings/storeProfile`).set({
            dominioProprio: dominio,
            dominioStatus: 'pendente_dns',
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return { success: true, data: response.data };

    } catch (error) {
        console.error("Erro na Vercel API:", error.response?.data || error.message);
        throw new functions.https.HttpsError(
            "internal", 
            error.response?.data?.error?.message || "Falha ao vincular o domínio na Vercel."
        );
    }
});