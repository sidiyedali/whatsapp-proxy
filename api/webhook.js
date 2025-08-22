// api/webhook.js - Proxy Vercel pour filtrer les webhooks WhatsApp
export default async function handler(req, res) {
  // Configuration CORS pour les requêtes Meta
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  console.log('🔥 Webhook reçu - Method:', req.method);

  // === GESTION DES REQUÊTES GET (Validation Meta) ===
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('🔍 Validation webhook Meta');
    console.log('Mode:', mode);
    console.log('Token reçu:', token);

    // Vérifiez que le token correspond à celui configuré dans Meta
    if (mode === 'subscribe' && token === 'innovai123') {
      console.log('✅ Token valide - Validation OK');
      return res.status(200).send(challenge);
    } else {
      console.log('❌ Token invalide');
      return res.status(403).send('Forbidden');
    }
  }

  // === GESTION DES REQUÊTES POST (Webhooks Meta) ===
  if (req.method === 'POST') {
    try {
      const data = req.body;
      
      console.log('📦 Données webhook reçues:', JSON.stringify(data, null, 2));

      // Vérifier la structure du webhook
      const entry = data?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      if (!entry || !change || !value) {
        console.log('⚠️ Structure webhook invalide');
        return res.status(200).send('received');
      }

      // === FILTRAGE INTELLIGENT ===
      
      // 1. Vérifier s'il y a des STATUTS (delivered, sent, read)
      const statuses = value.statuses;
      if (statuses && statuses.length > 0) {
        console.log('🚫 STATUT DÉTECTÉ - IGNORÉ');
        console.log('Type:', statuses[0]?.status);
        console.log('📊 ÉCONOMIE: 1 exécution n8n évitée !');
        return res.status(200).send('received');
      }

      // 2. Vérifier s'il y a des MESSAGES
      const messages = value.messages;
      if (!messages || messages.length === 0) {
        console.log('❌ Pas de messages - webhook ignoré');
        return res.status(200).send('received');
      }

      // 3. Vérifier le type de message
      const message = messages[0];
      if (!message || ['system', 'unsupported'].includes(message.type)) {
        console.log('🚫 Type de message non supporté:', message?.type);
        return res.status(200).send('received');
      }

      // === MESSAGE VALIDE - TRANSFERT VERS N8N ===
      console.log('✅ MESSAGE CLIENT DÉTECTÉ');
      console.log('📱 De:', message.from);
      console.log('💬 Texte:', message.text?.body);
      console.log('🚀 TRANSFERT vers n8n...');

      // URL de votre webhook n8n (à remplacer)
      const N8N_WEBHOOK_URL = 'https://sidiyedali78.app.n8n.cloud/webhook/whatsapp-webhook';

      // Transférer vers n8n
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (n8nResponse.ok) {
        console.log('✅ Webhook transféré avec succès vers n8n');
      } else {
        console.log('❌ Erreur lors du transfert vers n8n:', n8nResponse.status);
      }

      // Toujours répondre "received" à Meta
      return res.status(200).send('received');

    } catch (error) {
      console.error('❌ Erreur lors du traitement:', error);
      return res.status(200).send('received');
    }
  }

  // Méthode non supportée
  return res.status(405).send('Method Not Allowed');
}