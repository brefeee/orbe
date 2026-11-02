// Traduit l'interface d'après la langue choisie dans le launcher. Les articles de Wikipédia et les informations de l'utilisateur ne sont pas traduits.
(async () => {
  const code = await fetch('/api/lang').then(r => (r.ok ? r.json() : null)).then(d => d?.lang).catch(() => null);
  const column = { en: 1, es: 2 }[code];
  if (!column) return;
  document.documentElement.lang = code;

  const ROWS = [
    ['Tout ce que tu sais, sur une seule carte en 3D.', 'Everything you know, on a single 3D map.', 'Todo lo que sabes, en un solo mapa en 3D.'],
    ['Tout part d\'un point, qui se divise en Public et Privé. Tu ouvres un dossier, tu vois ce qui l\'entoure et pourquoi c\'est relié.', 'Everything starts from one point, split into Public and Private. Open a folder to see what surrounds it and why it is connected.', 'Todo parte de un punto, dividido en Público y Privado. Abres una carpeta y ves qué la rodea y por qué está conectada.'],
    ['Ouvrir Orbe', 'Open Orbe', 'Abrir Orbe'],
    ['Se connecter', 'Sign in', 'Iniciar sesión'],
    ['Se déconnecter', 'Sign out', 'Cerrar sesión'],
    ['Connecter son IA', 'Connect your AI', 'Conectar tu IA'],
    ['Le point Tout relié à Public et à Privé, entourés de dossiers', 'The All point linked to Public and Private, surrounded by folders', 'El punto Todo unido a Público y Privado, rodeados de carpetas'],
    ['Tout', 'All', 'Todo'],
    ['Public', 'Public', 'Público'],
    ['Privé', 'Private', 'Privado'],
    ['Tes IA', 'Your AIs', 'Tus IA'],
    ['L\'univers jusqu\'aux astéroïdes et comètes de la NASA, les pays et leurs villes, Wikipédia, les jeux, les logiciels. Chaque point a sa page explicative et ses sources.', 'The universe down to NASA\'s asteroids and comets, countries and their cities, Wikipedia, games and software. Every point has its own explanatory page and sources.', 'El universo hasta los asteroides y cometas de la NASA, los países y sus ciudades, Wikipedia, los juegos y los programas. Cada punto tiene su página explicativa y sus fuentes.'],
    ['Tes fichiers, tes notes et tes projets, dans une base chiffrée sur ton PC. Rien ne passe en public sans que tu le demandes et qu\'une personne le valide.', 'Your files, notes and projects, in an encrypted database on your PC. Nothing goes public unless you ask and a person approves it.', 'Tus archivos, notas y proyectos, en una base cifrada en tu PC. Nada se hace público sin que lo pidas y una persona lo apruebe.'],
    ['Connecte une IA pour qu\'elle range dans ta carte, ou pour qu\'elle vérifie une information proposée. Tu choisis laquelle, et tu vois ce qu\'elle peut faire.', 'Connect an AI to file things in your map or to check suggested information. You choose which one, and you see what it can do.', 'Conecta una IA para que ordene tu mapa o verifique una información propuesta. Tú eliges cuál y ves lo que puede hacer.'],
    ['Orbe est encore en développement : sa sécurité n\'a pas été auditée, et la version publique n\'est pas en ligne.', 'Orbe is still in development: its security has not been audited, and the public version is not online.', 'Orbe sigue en desarrollo: su seguridad no ha sido auditada y la versión pública no está en línea.'],
    ['Faire travailler tes IA ensemble', 'Make your AIs work together', 'Haz que tus IA trabajen juntas'],
    ['Une IA peut reformuler ta demande en vrai prompt, une autre faire le travail, une autre créer les images. Orbe utilise les clés d’API que tu ajoutes ici : elles restent dans ta base chiffrée, et chaque service peut te facturer ses demandes.', 'One AI can rewrite your request as a real prompt, another can do the work, another can create the images. Orbe uses the API keys you add here: they stay in your encrypted database, and each service may bill you for its requests.', 'Una IA puede reformular tu petición como un prompt real, otra hacer el trabajo y otra crear las imágenes. Orbe usa las claves de API que añades aquí: se quedan en tu base cifrada y cada servicio puede cobrarte sus solicitudes.'],
    ['Activer la répartition des tâches', 'Turn on task sharing', 'Activar el reparto de tareas'],
    ['Tes clés', 'Your keys', 'Tus claves'],
    ['Quelle IA fait quoi', 'Which AI does what', 'Qué IA hace qué'],
    ['Répartition suggérée', 'Suggested setup', 'Reparto sugerido'],
    ['Lancer une demande', 'Run a request', 'Lanzar una petición'],
    ['Lancer', 'Run', 'Lanzar'],
    ['Ta demande', 'Your request', 'Tu petición'],
    ['Clé enregistrée', 'Key saved', 'Clave guardada'],
    ['Modèle d’image', 'Image model', 'Modelo de imagen'],
    ['À choisir', 'To choose', 'Por elegir'],
    ['Personne', 'Nobody', 'Nadie'],
    ['Les IA travaillent. Ces demandes sont facturées sur tes clés.', 'The AIs are working. These requests are billed to your keys.', 'Las IA están trabajando. Estas solicitudes se cobran a tus claves.'],
    ['Accueil', 'Home', 'Inicio'],
    ['Retour', 'Back', 'Volver'],
    ['Vue', 'View', 'Vista'],
    ['Touche 1', 'Key 1', 'Tecla 1'],
    ['Touche 2', 'Key 2', 'Tecla 2'],
    ['Dossier', 'Folder', 'Carpeta'],
    ['Vue large', 'Wide view', 'Vista amplia'],
    ['Chercher dans la carte', 'Search the map', 'Buscar en el mapa'],
    ['Orbe a besoin de WebGL pour afficher la carte en 3D. Active l\'accélération matérielle dans les réglages du navigateur, puis recharge la page.', 'Orbe needs WebGL to show the 3D map. Turn on hardware acceleration in your browser settings, then reload the page.', 'Orbe necesita WebGL para mostrar el mapa en 3D. Activa la aceleración por hardware en los ajustes del navegador y recarga la página.'],
    ['Ouvrir la carte', 'Open the map', 'Abrir el mapa'],
    ['Le serveur ne répond pas.', 'The server is not responding.', 'El servidor no responde.'],
    ['Annuler', 'Cancel', 'Cancelar'],
    ['Entre ton code', 'Enter your code', 'Introduce tu código'],
    ['Mode test : aucun e-mail n’est envoyé. Le code est affiché dans la fenêtre noire du programme.', 'Test mode: no email is sent. The code is shown in the program\'s black window.', 'Modo de prueba: no se envía ningún correo. El código aparece en la ventana negra del programa.'],
    ['Code', 'Code', 'Código'],
    ['Changer d’adresse', 'Change address', 'Cambiar de dirección'],
    ['Valider', 'Confirm', 'Validar'],
    ['Entre ton adresse e-mail : tu reçois un code, sans mot de passe. Le compte se crée à la première connexion. Ton espace reste privé, et tu peux tout exporter ou supprimer.', 'Enter your email address: you get a code, no password. The account is created the first time you sign in. Your space stays private, and you can export or delete everything.', 'Introduce tu correo: recibes un código, sin contraseña. La cuenta se crea en el primer inicio de sesión. Tu espacio sigue siendo privado y puedes exportarlo o borrarlo todo.'],
    ['Adresse e-mail', 'Email address', 'Correo electrónico'],
    ['Recevoir un code', 'Get a code', 'Recibir un código'],
    ['Pas de compte ici', 'No account here', 'Aquí no hay cuenta'],
    ['Cette version tourne uniquement sur ton PC : elle n’a pas besoin de compte, et tes données restent chez toi.', 'This version runs only on your PC: it needs no account, and your data stays with you.', 'Esta versión funciona solo en tu PC: no necesita cuenta y tus datos se quedan contigo.'],
    ['La connexion par e-mail et code existe sur la version publique, qui n’est pas encore en ligne. On peut l’essayer sur ce PC avec « Lancer Orbe public ».', 'Sign-in by email and code exists on the public version, which is not online yet. You can try it on this PC with "Lancer Orbe public".', 'El acceso por correo y código existe en la versión pública, que aún no está en línea. Se puede probar en este PC con «Lancer Orbe public».'],
    ['Fermer', 'Close', 'Cerrar'],
    [' points de connaissance', ' knowledge points', ' puntos de conocimiento'],
    ['Analyser tes fichiers ?', 'Scan your files?', '¿Analizar tus archivos?'],
    ['Orbe peut lister les noms, tailles et dates des fichiers de ton dossier personnel pour les retrouver sur ta carte. Il ne lit jamais leur contenu.', 'Orbe can list the names, sizes and dates of the files in your personal folder so you can find them on your map. It never reads their contents.', 'Orbe puede listar los nombres, tamaños y fechas de los archivos de tu carpeta personal para encontrarlos en tu mapa. Nunca lee su contenido.'],
    ['Son : activé', 'Sound: on', 'Sonido: activado'],
    ['Son : coupé', 'Sound: off', 'Sonido: desactivado'],
    ['La liste reste sur ce PC, mais une IA que tu connectes à Orbe pourra y chercher. Tu pourras changer d’avis ici à tout moment : refuser efface la liste.', 'The list stays on this PC, but an AI you connect to Orbe can search it. You can change your mind here at any time: refusing erases the list.', 'La lista se queda en este PC, pero una IA que conectes a Orbe podrá buscar en ella. Puedes cambiar de opinión aquí en cualquier momento: rechazar borra la lista.'],
    ['Autoriser', 'Allow', 'Permitir'],
    ['Refuser', 'Refuse', 'Rechazar'],
    ['Analyse des fichiers : activée', 'File scan: on', 'Análisis de archivos: activado'],
    ['Analyse des fichiers : désactivée', 'File scan: off', 'Análisis de archivos: desactivado'],
    ['Ces applications passent par une adresse https en ligne et demandent souvent une connexion OAuth. Orbe propose pour l’instant une simple clé : ce branchement n’a pas été essayé et peut être refusé.', 'These apps use an online https address and often require an OAuth sign-in. For now Orbe offers a simple key: this connection has not been tried and may be refused.', 'Estas aplicaciones usan una dirección https en línea y suelen pedir un acceso OAuth. Por ahora Orbe ofrece una simple clave: esta conexión no se ha probado y puede ser rechazada.'],
    ['Dans ChatGPT : réglages, connecteurs, mode développeur, puis créer un connecteur. Un abonnement payant peut être demandé.', 'In ChatGPT: settings, connectors, developer mode, then create a connector. A paid plan may be required.', 'En ChatGPT: ajustes, conectores, modo desarrollador y crear un conector. Puede requerir una suscripción de pago.'],
    ['Sur grok.com/connectors, ajoute un connecteur. Un abonnement payant peut être demandé.', 'On grok.com/connectors, add a connector. A paid plan may be required.', 'En grok.com/connectors, añade un conector. Puede requerir una suscripción de pago.'],
    ['Dans Le Chat : connecteurs, ajouter un connecteur, onglet MCP personnalisé.', 'In Le Chat: connectors, add a connector, custom MCP tab.', 'En Le Chat: conectores, añadir un conector, pestaña MCP personalizado.'],
    ['Copié', 'Copied', 'Copiado'],
    ['Copier', 'Copy', 'Copiar'],
    ['À configurer', 'To set up', 'Por configurar'],
    ['Non disponible', 'Not available', 'No disponible'],
    ['Pas connectée', 'Not connected', 'No conectada'],
    ['Clé enregistrée, pas testée', 'Key saved, not tested', 'Clave guardada, sin probar'],
    ['Clé enregistrée, mais jamais testée.', 'Key saved, but never tested.', 'Clave guardada, pero nunca probada.'],
    ['A bien répondu au test', 'Passed the test', 'Respondió bien a la prueba'],
    ['Le test a échoué', 'The test failed', 'La prueba falló'],
    ['Choisis ton IA. Orbe t’indique ce qu’elle peut faire ici, et ce qui n’est pas possible.', 'Choose your AI. Orbe tells you what it can do here and what is not possible.', 'Elige tu IA. Orbe te indica lo que puede hacer aquí y lo que no es posible.'],
    ['Ton IA n’est pas dans la liste ?', 'Your AI is not on the list?', '¿Tu IA no está en la lista?'],
    ['Toute application compatible avec le protocole MCP peut utiliser le serveur d’Orbe. Suis les étapes de ', 'Any app compatible with the MCP protocol can use the Orbe server. Follow the steps on ', 'Cualquier aplicación compatible con el protocolo MCP puede usar el servidor de Orbe. Sigue los pasos de '],
    ['la page Claude', 'the Claude page', 'la página de Claude'],
    [' et adapte-les aux réglages de ton application.', ' and adapt them to your app\'s settings.', ' y adáptalos a los ajustes de tu aplicación.'],
    ['Lui donner accès à ta carte', 'Give it access to your map', 'Darle acceso a tu mapa'],
    ['Elle pourra lire ta carte privée et y ranger des informations. Ne le fais qu’avec une IA en qui tu as confiance.', 'It will be able to read your private map and file information in it. Only do this with an AI you trust.', 'Podrá leer tu mapa privado y guardar información en él. Hazlo solo con una IA en la que confíes.'],
    ['Le serveur d’Orbe ne répond pas.', 'The Orbe server is not responding.', 'El servidor de Orbe no responde.'],
    ['Claude Code : lance cette commande dans un terminal', 'Claude Code: run this command in a terminal', 'Claude Code: ejecuta este comando en un terminal'],
    ['Claude Desktop : ajoute ceci à claude_desktop_config.json', 'Claude Desktop: add this to claude_desktop_config.json', 'Claude Desktop: añade esto a claude_desktop_config.json'],
    ['Réglages, Développeur, Modifier la configuration, puis redémarre Claude. Fusionne avec tes autres serveurs si le fichier en contient déjà.', 'Settings, Developer, Edit Config, then restart Claude. Merge with your other servers if the file already has some.', 'Ajustes, Desarrollador, Editar configuración y reinicia Claude. Combínalo con tus otros servidores si el archivo ya los tiene.'],
    ['Cela marche avec Gemini CLI, le programme pour terminal, et non avec le site gemini.google.com. Ce branchement suit la documentation de Gemini CLI, mais il n’a pas été essayé.', 'This works with Gemini CLI, the terminal program, not with the gemini.google.com site. This setup follows the Gemini CLI documentation but has not been tried.', 'Funciona con Gemini CLI, el programa para terminal, y no con el sitio gemini.google.com. Esta conexión sigue la documentación de Gemini CLI, pero no se ha probado.'],
    ['Ajoute ceci à ~/.gemini/settings.json', 'Add this to ~/.gemini/settings.json', 'Añade esto a ~/.gemini/settings.json'],
    ['Pour vérifier : demande à ton IA de lister les dossiers d’Orbe. Si elle y arrive, c’est branché. Orbe ne peut pas le voir tout seul depuis cette page.', 'To check: ask your AI to list Orbe\'s folders. If it can, it is connected. Orbe cannot detect this by itself from this page.', 'Para comprobarlo: pide a tu IA que liste las carpetas de Orbe. Si lo consigue, está conectada. Orbe no puede detectarlo por sí solo desde esta página.'],
    ['Se connecter pour continuer', 'Sign in to continue', 'Inicia sesión para continuar'],
    ['Adresse du serveur', 'Server address', 'Dirección del servidor'],
    ['Ta clé, affichée une seule fois (en-tête Authorization: Bearer)', 'Your key, shown only once (Authorization: Bearer header)', 'Tu clave, mostrada una sola vez (cabecera Authorization: Bearer)'],
    ['Créer une clé d’accès', 'Create an access key', 'Crear una clave de acceso'],
    ['Créer une nouvelle clé désactive l’ancienne.', 'Creating a new key turns off the old one.', 'Crear una clave nueva desactiva la anterior.'],
    ['Lui faire vérifier les informations', 'Have it check information', 'Hacer que verifique la información'],
    ['Cette partie demande un compte, donc la version publique. Elle n’existe pas dans la version installée sur ton PC.', 'This part needs an account, so the public version. It does not exist in the version installed on your PC.', 'Esta parte requiere una cuenta, es decir, la versión pública. No existe en la versión instalada en tu PC.'],
    ['Se connecter pour ajouter une clé', 'Sign in to add a key', 'Inicia sesión para añadir una clave'],
    ['Test en cours : une vraie demande, facturée sur ta clé.', 'Test running: a real request, billed to your key.', 'Prueba en curso: una solicitud real, facturada a tu clave.'],
    ['Tester avec une vraie demande', 'Test with a real request', 'Probar con una solicitud real'],
    ['Retirer la clé', 'Remove the key', 'Quitar la clave'],
    ['Facultatif', 'Optional', 'Opcional'],
    ['Nom exact du modèle', 'Exact model name', 'Nombre exacto del modelo'],
    ['Clé d’API', 'API key', 'Clave de API'],
    ['Modèle', 'Model', 'Modelo'],
    ['Demandes maximum par jour', 'Maximum requests per day', 'Solicitudes máximas por día'],
    ['Utiliser aussi ma clé pour les propositions des autres, à mes frais', 'Also use my key for other people\'s suggestions, at my expense', 'Usar también mi clave para las propuestas de otros, a mi cargo'],
    ['Enregistrer la clé', 'Save the key', 'Guardar la clave'],
    ['← Toutes les IA', '← All AIs', '← Todas las IA'],
    ['Orbe ne répond pas. Vérifie que la fenêtre du programme est ouverte.', 'Orbe is not responding. Check that the program window is open.', 'Orbe no responde. Comprueba que la ventana del programa esté abierta.'],
    ['Voir', 'View', 'Ver'],
    ['Ce dossier de l’atlas est introuvable.', 'This atlas folder cannot be found.', 'No se encuentra esta carpeta del atlas.'],
    ['Ce dossier n’est pas accessible dans cet espace.', 'This folder is not available in this space.', 'Esta carpeta no está disponible en este espacio.'],
    ['Cet article est introuvable dans l’atlas.', 'This article cannot be found in the atlas.', 'No se encuentra este artículo en el atlas.'],
    ['Emplacement', 'Location', 'Ubicación'],
    ['Renommer', 'Rename', 'Renombrar'],
    ['Déplacer', 'Move', 'Mover'],
    ['Supprimer', 'Delete', 'Eliminar'],
    ['Page explicative', 'Explanatory page', 'Página explicativa'],
    ['Rien ne découle encore de ce dossier.', 'Nothing flows from this folder yet.', 'Nada deriva todavía de esta carpeta.'],
    ['Le décompte porte sur les dossiers de l’atlas déjà ouverts.', 'The count covers atlas folders already opened.', 'El recuento incluye las carpetas del atlas ya abiertas.'],
    ['Masquer le reste de la carte', 'Hide the rest of the map', 'Ocultar el resto del mapa'],
    ['Nouvelle information', 'New information', 'Nueva información'],
    ['Informations', 'Information', 'Información'],
    ['Filtrer par auteur', 'Filter by author', 'Filtrar por autor'],
    ['Toutes', 'All', 'Todas'],
    ['Les miennes', 'Mine', 'Las mías'],
    ['Ctrl + Entrée pour ranger', 'Ctrl + Enter to file', 'Ctrl + Intro para guardar'],
    ['Ranger', 'File', 'Guardar'],
    ['Rien de rangé ici pour le moment.', 'Nothing filed here yet.', 'Aún no hay nada guardado aquí.'],
    ['Détails', 'Details', 'Detalles'],
    ['Modifier', 'Edit', 'Editar'],
    ['Une source par ligne', 'One source per line', 'Una fuente por línea'],
    ['Détails de l’information', 'Information details', 'Detalles de la información'],
    ['Titre', 'Title', 'Título'],
    ['Description', 'Description', 'Descripción'],
    ['Fiabilité', 'Reliability', 'Fiabilidad'],
    ['Sources', 'Sources', 'Fuentes'],
    ['Historique', 'History', 'Historial'],
    ['Enregistrer', 'Save', 'Guardar'],
    ['Information rangée.', 'Information filed.', 'Información guardada.'],
    ['Nouvelle catégorie', 'New category', 'Nueva categoría'],
    ['Nom de la nouvelle catégorie', 'New category name', 'Nombre de la nueva categoría'],
    ['Catégories à l’intérieur', 'Categories inside', 'Categorías dentro'],
    ['Créer', 'Create', 'Crear'],
    ['Retirer cette connexion', 'Remove this connection', 'Quitar esta conexión'],
    ['Retirer', 'Remove', 'Quitar'],
    ['Connexions', 'Connections', 'Conexiones'],
    ['Ce dossier n’est relié à aucun autre pour le moment.', 'This folder is not linked to any other yet.', 'Esta carpeta aún no está unida a ninguna otra.'],
    ['Relier à un autre dossier', 'Link to another folder', 'Unir a otra carpeta'],
    ['Clique sur un dossier pour y entrer. Glisse pour tourner, molette pour zoomer.', 'Click a folder to enter it. Drag to rotate, scroll to zoom.', 'Haz clic en una carpeta para entrar. Arrastra para girar, usa la rueda para acercar.'],
    ['Clique pour suivre ce qui découle d’un dossier, double-clique pour l’ouvrir.', 'Click to follow what flows from a folder, double-click to open it.', 'Haz clic para seguir lo que deriva de una carpeta, doble clic para abrirla.'],
    ['contient', 'contains', 'contiene'],
    ['connexion', 'connection', 'conexión'],
    ['Nom', 'Name', 'Nombre'],
    ['Modifier l’information', 'Edit the information', 'Editar la información'],
    ['Supprimer cette information ?', 'Delete this information?', '¿Eliminar esta información?'],
    ['Taper un nom de dossier', 'Type a folder name', 'Escribe el nombre de una carpeta'],
    ['Aucun dossier ne correspond.', 'No folder matches.', 'Ninguna carpeta coincide.'],
    ['finance, inspire, dépend de…', 'finance, inspires, depends on…', 'finanzas, inspira, depende de…'],
    ['Relier', 'Link', 'Unir'],
    ['Vers quel dossier ?', 'To which folder?', '¿A qué carpeta?'],
    ['Quelle est la fonction de ce lien ?', 'What does this link do?', '¿Qué función tiene este enlace?'],
    ['Précision', 'Note', 'Precisión'],
    ['Dans quel dossier ?', 'In which folder?', '¿En qué carpeta?'],
    ['Aucun résultat.', 'No results.', 'Sin resultados.'],
    ['Montrer ce fichier dans l’Explorateur', 'Show this file in Explorer', 'Mostrar este archivo en el Explorador'],
    ['Wikipédia ne répond pas.', 'Wikipedia is not responding.', 'Wikipedia no responde.'],
    ['Texte et images : ', 'Text and images: ', 'Texto e imágenes: '],
    ['Auteurs et historique', 'Authors and history', 'Autores e historial'],
    ['Chargement de la page…', 'Loading the page…', 'Cargando la página…'],
    ['Impossible de charger la page : vérifie ta connexion internet.', 'Could not load the page: check your internet connection.', 'No se pudo cargar la página: comprueba tu conexión a internet.'],
    ['Voir la liste sur Wikipédia', 'See the list on Wikipedia', 'Ver la lista en Wikipedia'],
    ['non vérifié', 'unverified', 'sin verificar'],
    ['probable', 'likely', 'probable'],
    ['vérifié', 'verified', 'verificado'],
    ['contesté', 'disputed', 'discutido'],
    ['faux', 'false', 'falso'],
  ];
  const PATTERNS = [
    [/^Reformuler la demande en vrai prompt( : .*)?$/, 'Rewrite the request as a real prompt$1', 'Reformular la petición como un prompt real$1'],
    [/^Faire le travail( : .*)?$/, 'Do the work$1', 'Hacer el trabajo$1'],
    [/^Créer les images( : .*)?$/, 'Create the images$1', 'Crear las imágenes$1'],
    [/^(.*) dans l'atlas, (.*) titres de Wikipédia \(redirections comprises\), (.*) sur ta carte, (.*) objets de Gaia lus en direct$/, '$1 in the atlas, $2 Wikipedia titles (redirects included), $3 on your map, $4 Gaia objects read live', '$1 en el atlas, $2 títulos de Wikipedia (redirecciones incluidas), $3 en tu mapa, $4 objetos de Gaia leídos en directo'],
    [/^(.*) dans l'atlas, (.*) titres de Wikipédia \(redirections comprises\), (.*) sur ta carte$/, '$1 in the atlas, $2 Wikipedia titles (redirects included), $3 on your map', '$1 en el atlas, $2 títulos de Wikipedia (redirecciones incluidas), $3 en tu mapa'],
    [/^(.*) dans l'atlas, (.*) titres de Wikipédia \(redirections comprises\), (.*) sur la carte publique$/, '$1 in the atlas, $2 Wikipedia titles (redirects included), $3 on the public map', '$1 en el atlas, $2 títulos de Wikipedia (redirecciones incluidas), $3 en el mapa público'],
    [/^Connecté : (.*)$/, 'Signed in: $1', 'Conectado: $1'],
    [/^Un code à 6 chiffres a été envoyé à (.*)\. Il expire dans 10 minutes\.$/, 'A 6-digit code was sent to $1. It expires in 10 minutes.', 'Se ha enviado un código de 6 cifras a $1. Caduca en 10 minutos.'],
    [/^Je n’ai pas trouvé de moyen officiel de brancher (.*) à une carte externe\. Seule la vérification ci-dessous est possible\.$/, 'I found no official way to connect $1 to an external map. Only the check below is possible.', 'No he encontrado una forma oficial de conectar $1 a un mapa externo. Solo es posible la verificación de abajo.'],
    [/^Je n’ai pas trouvé de moyen fiable de brancher (.*) à Orbe\.$/, 'I found no reliable way to connect $1 to Orbe.', 'No he encontrado una forma fiable de conectar $1 a Orbe.'],
    [/^(.*) Il faut d’abord qu’Orbe public soit en ligne : ce n’est pas encore le cas, donc ce n’est pas possible aujourd’hui\.$/, 'Public Orbe must be online first: it is not yet, so this is not possible today.', 'Primero Orbe público debe estar en línea: aún no lo está, así que hoy no es posible.'],
    [/^Quand une information est proposée pour la carte publique, (.*) reçoit 3 demandes pour donner son avis\. Une personne décide toujours de la publication, car une IA peut se tromper\.$/, 'When information is suggested for the public map, $1 gets 3 requests to give its opinion. A person always decides on publication, because an AI can be wrong.', 'Cuando se propone una información para el mapa público, $1 recibe 3 solicitudes para opinar. Una persona siempre decide la publicación, porque una IA puede equivocarse.'],
    [/^Dernier test : (.*)$/, 'Last test: $1', 'Última prueba: $1'],
    [/^Modèle (.*)\. Partagée avec les autres utilisateurs\. (.*) demandes sur (.*) aujourd’hui\.$/, 'Model $1. Shared with other users. $2 of $3 requests today.', 'Modelo $1. Compartida con otros usuarios. $2 de $3 solicitudes hoy.'],
    [/^Modèle (.*)\. Pour tes propositions seulement\. (.*) demandes sur (.*) aujourd’hui\.$/, 'Model $1. For your suggestions only. $2 of $3 requests today.', 'Modelo $1. Solo para tus propuestas. $2 de $3 solicitudes hoy.'],
    [/^Claude (.*)\.$/, 'Claude: $1.', 'Claude: $1.'],
    [/^(\d+) catégories? découlen?t? de ce dossier, dont (\d+) connexions? vers d'autres dossiers ou entre eux\.$/, '$1 categories flow from this folder, including $2 connections to other folders or between them.', '$1 categorías derivan de esta carpeta, con $2 conexiones hacia otras carpetas o entre ellas.'],
    [/^La 3D en montre les (\d+) plus proches\. Clique sur un dossier pour descendre\.$/, 'The 3D view shows the nearest $1. Click a folder to go deeper.', 'La vista 3D muestra las $1 más cercanas. Haz clic en una carpeta para bajar.'],
    [/^Écris ce que tu veux ranger dans (.*)$/, 'Write what you want to file in $1', 'Escribe lo que quieres guardar en $1'],
    [/^Afficher plus \((\d+) restant(?:e)?s\)$/, 'Show more ($1 left)', 'Mostrar más (quedan $1)'],
    [/^Voir le contenu \((\d+) Ko\)$/, 'View content ($1 KB)', 'Ver contenido ($1 KB)'],
    [/^Catégorie (.*) créée dans (.*)\.$/, 'Category $1 created in $2.', 'Categoría $1 creada en $2.'],
    [/^Supprimer (.*) \?$/, 'Delete $1?', '¿Eliminar $1?'],
    [/^Cela supprime (\d+) catégories?, (\d+) informations? et (\d+) connexions?\.$/, 'This deletes $1 categories, $2 pieces of information and $3 connections.', 'Esto elimina $1 categorías, $2 informaciones y $3 conexiones.'],
    [/^(.*) est relié à (.*)\.$/, '$1 is linked to $2.', '$1 está unido a $2.'],
    [/^Relier (.*)$/, 'Link $1', 'Unir $1'],
    [/^Déplacer (.*)$/, 'Move $1', 'Mover $1'],
    [/^Aucune page Wikipédia en français ne porte le nom « (.*) »\. Cette fiche contient seulement les données du catalogue\.$/, 'No French Wikipedia page is named "$1". This entry only has catalog data.', 'Ninguna página de Wikipedia en francés se llama «$1». Esta ficha solo contiene datos del catálogo.'],
  ];
  const WORDS = new Map(ROWS.map(row => [row[0].trim(), row[column]]));
  const translate = text => {
    const key = text.trim();
    if (!key) return text;
    const plain = WORDS.get(key);
    let out = plain;
    if (out === undefined) {
      const pattern = PATTERNS.find(p => p[0].test(key));
      if (!pattern) return text;
      out = key.replace(pattern[0], pattern[column]);
    }
    return text.replace(key, out.trim());
  };
  const KEEP = '.article-body, .entry-text, pre, script, style, textarea, input';
  const ATTRS = ['placeholder', 'title', 'aria-label'];

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.parentElement?.closest(KEEP)) return;
      const next = translate(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const attr of ATTRS) {
        if (node.hasAttribute(attr)) {
          const value = node.getAttribute(attr);
          const next = translate(value);
          if (next !== value) node.setAttribute(attr, next);
        }
      }
      if (!node.matches('script, style')) node.childNodes.forEach(walk);
    }
  }

  const run = () => {
    document.title = translate(document.title);
    walk(document.documentElement);
    new MutationObserver(changes => {
      for (const change of changes) {
        if (change.type === 'characterData') walk(change.target);
        else if (change.type === 'attributes') walk(change.target);
        else change.addedNodes.forEach(walk);
      }
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
