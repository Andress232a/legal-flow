LegalFlow - Plataforma de Gestión de Procesos Legales para Bufetes 
1. Visión General del Proyecto 
El presente documento formaliza la asignación y define el alcance del proyecto LegalFlow, una 
plataforma tecnológica integral diseñada para modernizar la gestión interna de bufetes de abogados y 
departamentos legales corporativos. LegalFlow nace de la necesidad crítica de transformar la operativa 
tradicional, basada en archivos locales, hojas de cálculo y correo electrónico, hacia un entorno digital 
centralizado, seguro y eficiente. El objetivo es liberar a los profesionales del derecho de las tareas 
administrativas redundantes y propensas a errores, permitiéndoles concentrarse en el trabajo legal de 
alto valor. 
La plataforma LegalFlow no es un simple repositorio de documentos, sino un ecosistema integral de 
gestión legal que aborda el ciclo de vida completo de un caso: desde la creación y asignación, pasando 
por el control de tiempo y la gestión documental, hasta la facturación y el seguimiento de plazos 
procesales. Dada la naturaleza sensible de la información legal, el sistema se construirá bajo 
una arquitectura de microservicios con un enfoque "Security by Design", donde la confidencialidad, 
integridad y disponibilidad de los datos son el pilar fundamental. Cada dominio de negocio (usuarios y 
permisos, casos, documentos, tiempo, facturación, plazos) operará como un servicio independiente 
pero perfectamente integrado a través de un API Gateway que centraliza la autenticación y autorización. 
El resultado será una herramienta que garantice el cumplimiento normativo (protección de datos, 
secreto profesional) y ofrezca a los bufetes la visibilidad y el control necesarios para optimizar su 
rentabilidad y calidad de servicio. 
2. Funcionalidades Clave del Sistema 
El nuevo sistema LegalFlow cubrirá la totalidad de las operaciones de un bufete, desde la gestión de 
usuarios hasta la analítica de negocio. 
• Microservicio de Gestión de Usuarios y Permisos (IAM Service): El pilar de la seguridad. 
Gestiona los perfiles de todos los actores: abogados, asistentes legales, clientes y 
administradores del bufete. Implementa un sistema de control de acceso basado en roles 
(RBAC) extremadamente granular. Define permisos a nivel de caso (ej. "el abogado X puede 
editar documentos en el caso Y"), de tipo de documento, e incluso de campos específicos. Este 
servicio es consultado por el API Gateway y por cada microservicio para autorizar cada petición 
individual. 
• Microservicio de Gestión de Casos (Matter Service): El núcleo de la aplicación. Gestiona el 
ciclo de vida de un caso legal, almacenando todos sus metadatos: tipo de caso (civil, penal, 
corporativo), jurisdicción, juzgado, número de expediente, estado (abierto, cerrado, en 
apelación), fechas clave y partes involucradas (cliente, abogado asignado, procurador, 
partes contrarias). 
• Microservicio de Gestión Documental (Document Service): Un sistema de almacenamiento 
seguro con versionado completo de todos los documentos legales (PDFs de demandas, 
contratos en DOCX, imágenes de pruebas). Implementa indexación y capacidades de 
búsqueda avanzada (por contenido, metadatos, tipo de documento). Gestiona la firma 
digital de documentos y mantiene una pista de auditoría de todas las acciones (descargas, 
modificaciones, visualizaciones). Los documentos se almacenan cifrados y los accesos son 
estrictamente controlados. 
• Microservicio de Control de Tiempo (Time Tracking Service): Permite a los abogados y 
asistentes registrar el tiempo dedicado a cada tarea de un caso. Ofrece dos 
modalidades: temporizador en tiempo real (start/stop) y entrada manual de horas. Cada 
entrada de tiempo incluye una descripción de la tarea, la fecha, la duración y se asocia a un 
caso y, opcionalmente, a una tarea predefinida. Estos registros son la base para la facturación. 
• Microservicio de Facturación y Gestión de Honorarios (Billing Service): Consume los 
registros del Time Tracking Service y, aplicando la estructura de honorarios acordada con el 
cliente (tarifa plana, por hora, honorarios de éxito), genera facturas electrónicas. Gestiona el 
envío de facturas a los clientes (a través del portal o por email), el registro de pagos y el control 
de la morosidad. Se integra con pasarelas de pago externas para facilitar la liquidación. 
• Microservicio de Calendario y Plazos Procesales (Calendar Service): Un calendario 
inteligente específico para el ámbito legal. Permite la introducción de plazos procesales 
críticos (ej. "20 días hábiles para presentar recurso de apelación desde la notificación de la 
sentencia") y calcula automáticamente las fechas límite, considerando días inhábiles. 
Envía alertas y notificaciones automáticas (por email, push) a los abogados responsables con 
antelación configurable. 
• Microservicio de Portal del Cliente (Client Portal Service): Sirve una interfaz web segura y 
restringida para que los clientes puedan acceder a la información de sus casos. Pueden ver el 
progreso, descargar documentos autorizados, recibir facturas, ver el historial de tiempo 
facturado y comunicarse de forma segura con su abogado a través de mensajes internos. Este 
servicio aplica sus propias políticas de autorización, basándose en la información del IAM 
Service. 
• Microservicio de Panel de Control y Analítica (Analytics Service): Un dashboard para la 
gerencia del bufete que consolida datos del resto de servicios para mostrar KPIs clave: carga de 
trabajo por abogado, rentabilidad por caso/cliente, estado de la facturación (ingresos, 
facturas pendientes), cumplimiento de plazos, y evolución de la cartera de casos. 
Proporciona visibilidad estratégica para la toma de decisiones. 
3. Arquitectura de Microservicios Detallada 
La plataforma LegalFlow se construirá sobre una arquitectura de microservicios con un diseño centrado 
en la seguridad y el control de acceso. 
1. API Gateway: El punto de entrada único para todas las aplicaciones cliente. Su función 
principal es validar los tokens JWT de las peticiones entrantes y, a continuación, consultar 
al IAM Service para obtener los permisos del usuario. Con esa información, decide si enruta la 
petición al microservicio correspondiente o la rechaza. Esto centraliza la lógica de 
autenticación y autorización a nivel de entrada. 
2. IAM Service: El servicio maestro de identidad y acceso. Almacena usuarios, roles, y una matriz 
de permisos. Expone una API para que el Gateway y otros servicios verifiquen permisos de forma 
síncrona (ej. "¿Puede el usuario U123 realizar la acción EDIT sobre el recurso CASE:456?"). 
También publica eventos de cambio de permisos. 
3. Matter Service: Gestiona los casos. Cada endpoint de este servicio, aunque ya viene con un 
token validado por el Gateway, puede realizar una verificación adicional de permisos a nivel 
de recurso consultando al IAM Service (ej. para asegurar que un abogado solo pueda modificar 
casos en los que está asignado como responsable). 
4. Document Service: Similar al anterior, pero con verificaciones de permiso aún más estrictas 
antes de permitir la descarga o modificación de cualquier documento. Todos los accesos a 
documentos (lectura/escritura) son auditados en una base de datos de logs. 
5. Time Tracking Service, Billing Service, Calendar Service, Client Portal Service, Analytics 
Service: Cada uno con su propia lógica de negocio y base de datos, y todos ellos verificando los 
permisos de las peticiones entrantes contra el IAM Service para garantizar que ningún dato 
sensible sea expuesto. 
4. Estrategia de Base de Datos 
Cada microservicio tendrá su propia base de datos PostgreSQL, siguiendo el principio de aislamiento. 
• IAM Service DB: Almacena usuarios (con contraseñas hasheadas), roles y una estructura de 
permisos 
(posiblemente 
utilizando 
el 
modelo RBAC con 
tablas 
para users, roles, permissions y user_role, role_permission). Datos extremadamente sensibles, 
con cifrado en reposo. 
• Matter Service DB: Tablas cases, case_parties, case_dates. Almacena los metadatos de los 
casos. 
• Document Service DB: Almacena los metadatos de los documentos (nombre, tipo, tamaño, 
hash, versión, ruta de almacenamiento cifrada). Los archivos en sí pueden almacenarse en un 
sistema de objetos (como AWS S3 o el almacenamiento de Render) cifrados. La base de datos 
también contiene la tabla de auditoría document_access_log. 
• Time 
Tracking 
Service 
DB: Tablas time_entries (con 
campos user_id, case_id, date, duration, description, billable). Índices críticos para búsquedas 
por caso y por usuario. 
• Billing Service DB: Tablas invoices, invoice_items, payments, client_rate_agreements. 
• Calendar 
Service 
campos case_id, title, due_date, reminder_dates, status). 
DB: Tablas deadlines (con 
• Client Portal Service DB: Puede ser mínima, ya que actúa principalmente como fachada, pero 
podría almacenar preferencias de comunicación del cliente o mensajes internos. 
• Analytics Service DB: Almacena datos pre-agregados para los dashboards, alimentados por 
procesos ETL que extraen datos de réplicas de solo lectura de las bases de datos de otros 
servicios. 
5. Pila Tecnológica (Stack) Propuesta 
Se propone Python con Django REST Framework (DRF) como opción principal para el backend. Django 
ofrece un ecosistema maduro y "batteries-included" con características de seguridad excepcionales 
(protección CSRF, XSS, SQL injection, sistema de usuarios y permisos robusto) que son fundamentales 
para una aplicación legal. Además, su potente panel de administración podría ser una herramienta muy 
valiosa para el equipo interno de LegalFlow para gestionar usuarios, permisos y depurar incidencias. 
• Backend (Microservicios): 
o Framework: Django REST Framework (DRF) . Cada microservicio será un proyecto 
Django independiente que expone una API REST. 
o Autenticación/Autorización: Uso del sistema de autenticación de Django (JWT 
mediante djangorestframework-simplejwt) 
y, 
sobre todo, su sistema de 
permisos (django-guardian para permisos a nivel de objeto) para implementar el 
control de acceso granular que requiere LegalFlow. 
o ORM: El ORM de Django, maduro y robusto. 
o Comunicación Asíncrona: Celery con Redis como broker para manejar tareas en 
segundo plano (ej. envío de notificaciones de plazos, generación de facturas) y para la 
comunicación basada en eventos entre servicios. 
o API: Django REST Framework para exponer las APIs RESTful. 
o Panel de Administración: El django-admin integrado, que proporciona una interfaz 
completa para gestionar los datos de la aplicación, extremadamente útil para el equipo 
interno. 
• Base de Datos y Caché: 
o Base de Datos Principal: PostgreSQL (gestionado en Render). 
o Caché y Broker de Eventos: Redis (gestionado en Render). 
• Frontend (Múltiples Aplicaciones): 
o Panel 
de 
Administración 
(Abogados) 
y 
Portal 
del 
Cliente: React.js con TypeScript y TailwindCSS. Se crearán dos aplicaciones React 
independientes que se comunican con el backend a través del API Gateway. Se 
desplegarán en Vercel. 
o Autenticación: Se gestionará mediante JWT. El frontend almacenará el token de forma 
segura (ej. en memoria o httpOnly cookies) y lo incluirá en cada petición al API Gateway. 
6. Comunicación entre Servicios 
• Síncrona (REST): La mayoría de las interacciones de usuario serán síncronas vía REST a través 
del API Gateway. El Gateway valida el token y los permisos básicos, y enruta la petición al 
servicio correspondiente. Para operaciones que requieren verificación de permisos a nivel de 
recurso, el servicio destino hará una llamada REST síncrona al IAM Service para confirmar. 
o Ejemplo: Un abogado intenta descargar un documento. La petición llega al Gateway 
con su JWT. El Gateway la enruta al Document Service. El Document Service extrae 
el user_id del token y el document_id de la URL, y llama al endpoint /api/iam/check
permission del IAM Service con los parámetros (user_id, 'DOWNLOAD', 'DOCUMENT', 
document_id). Solo si la respuesta es positiva, procede a generar la descarga y registra 
el acceso en su log de auditoría. 
• Asíncrona (Eventos con Celery/Redis): Para procesos en segundo plano y notificaciones. 
o El Calendar Service, cuando se acerca un plazo, encola una tarea en Celery que será 
procesada por el Notification Service (o un worker dedicado) para enviar un email de 
alerta. 
o Cuando se cierra un caso en el Matter Service, publica un evento case.closed. El Billing 
Service consume este evento para verificar si quedan facturas pendientes asociadas a 
ese caso y generar una alerta. 
7. DevOps y Despliegue (CI/CD) 
• Control de Versiones: Git con GitHub Flow. 
• Integración Continua (CI) con GitHub Actions: Por cada Pull Request, se ejecutará un pipeline 
con: 
o Linting y formato (Flake8, Black). 
o Pruebas unitarias y de integración (pytest). 
o Análisis de seguridad: Escaneo de dependencias vulnerables (safety), escaneo de 
secretos en el código (GitHub secret scanning) y análisis de código estático 
(SonarCloud o CodeQL). 
o Construcción de la imagen Docker. 
• Despliegue Continuo (CD): 
o Al hacer merge a main, se construye la imagen Docker de producción y se sube 
a GHCR. 
o Se despliega automáticamente en el entorno de staging en Render. 
o Tras pruebas de humo exitosas en staging, se requiere aprobación manual en el 
entorno de GitHub para desplegar a producción en Render. 
8. Entorno de Despliegue y Seguridad 
• Frontend (React): Hosteado en Vercel. 
• Backend (Django) y Bases de Datos: Todos los microservicios y sus instancias de PostgreSQL 
se desplegarán en Render, utilizando redes privadas para la comunicación interna.