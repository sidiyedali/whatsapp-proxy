// api/webhook.js - Proxy Vercel pour filtrer les webhooks WhatsApp (OPTIMISÉ)
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
      
      console.log('📦 Données webhook reçues');

      // Vérifier la structure du webhook
      const entry = data?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      if (!entry || !change || !value) {
        console.log('⚠️ Structure webhook invalide');
        return res.status(200).send('received');
      }

      // === FILTRAGE PRIORITÉ 1 : STATUTS ===
      const statuses = value.statuses;
      if (statuses && statuses.length > 0) {
        console.log('🚫 STATUT DÉTECTÉ - IGNORÉ');
        console.log('Type:', statuses[0]?.status);
        console.log('📊 ÉCONOMIE: 1 exécution n8n évitée !');
        return res.status(200).send('received');
      }

      // === FILTRAGE PRIORITÉ 2 : MESSAGES VIDES ===
      const messages = value.messages;
      if (!messages || messages.length === 0) {
        console.log('❌ Pas de messages - webhook ignoré');
        return res.status(200).send('received');
      }

      const message = messages[0];
      if (!message || ['system', 'unsupported'].includes(message.type)) {
        console.log('🚫 Type de message non supporté:', message?.type);
        return res.status(200).send('received');
      }

      // === FILTRAGE PRIORITÉ 3 : ANTI-BOUCLE ===
      const messageFrom = message.from;
      const businessPhoneId = "724478677421200"; // Votre Phone Number ID
      const businessDisplayNumber = "33143052094"; // Votre numéro d'affichage

      console.log('🔍 Vérification anti-boucle');
      console.log('📱 Message de:', messageFrom);
      console.log('🏢 Business ID:', businessPhoneId);
      console.log('📞 Business Display:', businessDisplayNumber);

      // Bloquer les messages DE votre business (boucle)
      if (messageFrom === businessPhoneId || messageFrom === businessDisplayNumber) {
        console.log('🔄 MESSAGE DU BUSINESS - BOUCLE DÉTECTÉE - IGNORÉ');
        console.log('📊 ÉCONOMIE: Boucle évitée !');
        return res.status(200).send('received');
      }

      // === FILTRAGE PRIORITÉ 4 : DÉDUPLICATION ===
      const messageText = message.text?.body || '';
      const messageId = message.id || `${messageFrom}_${message.timestamp}_${messageText.slice(0, 10)}`;
      
      // Initialiser le cache global s'il n'existe pas
      if (!global.recentMessages) {
        global.recentMessages = new Map();
      }

      // Vérifier si déjà traité dans les 60 dernières secondes
      if (global.recentMessages.has(messageId)) {
        console.log('🔄 MESSAGE DÉJÀ TRAITÉ - IGNORÉ');
        console.log('🆔 ID:', messageId);
        return res.status(200).send('received');
      }

      // Marquer comme traité
      global.recentMessages.set(messageId, Date.now());
      setTimeout(() => global.recentMessages.delete(messageId), 60000);

      // === MESSAGE CLIENT VALIDE - TRANSFERT VERS N8N ===
      console.log('✅ MESSAGE CLIENT VALIDE DÉTECTÉ');
      console.log('📱 De:', messageFrom);
      console.log('💬 Texte:', messageText.substring(0, 50) + '...');
      console.log('🆔 ID unique:', messageId);
      console.log('🚀 TRANSFERT vers n8n...');

      // URL de votre webhook n8n
  //    const N8N_WEBHOOK_URL = 'https://sidiyedali78.app.n8n.cloud/webhook/whatsapp-webhook';
     //  const N8N_WEBHOOK_URL = 'https://n8n.innovai-consulting.com/webhook/whatsapp-webhook';
      //dev
      const N8N_WEBHOOK_URL =https://n8n.innovai-consulting.com/webhook-test/whatsapp-webhook

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
        console.log('📊 RÉSULTAT: 1 exécution n8n au lieu de plusieurs !');
      } else {
        console.log('❌ Erreur lors du transfert vers n8n:', n8nResponse.status);
        console.log('📄 Réponse n8n:', await n8nResponse.text());
      }

      // Toujours répondre "received" à Meta
      return res.status(200).send('received');

    } catch (error) {
      console.error('❌ Erreur lors du traitement:', error);
      return res.status(200).send('received');
    }
  }

  // Méthode non supportée
  console.log('❌ Méthode non supportée:', req.method);
  return res.status(405).send('Method Not Allowed');
}
