import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. ALLE TABELLEN LEEREN (richtige Reihenfolge!)
  await prisma.quizAnswer.deleteMany();
  await prisma.quizParticipation.deleteMany();
  await prisma.quizSession.deleteMany();
  await prisma.lessonQuiz.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.lessonMaterial.deleteMany();
  await prisma.material.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.note.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.block.deleteMany();
  await prisma.gradingSchema.deleteMany();
  await prisma.groupAssignment.deleteMany();
  await prisma.learningGroup.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();

  console.log('All tables cleared');

  // 2. DATEN EINSETZEN (richtige Reihenfolge!)

  // User
  const users = [
  {
    "id": "01ed6e10-397e-446c-9254-2ad7fd4ec777",
    "name": "Frau Christ",
    "loginCode": "1",
    "role": "TEACHER",
    "createdAt": "2025-07-29T20:07:41.020Z",
    "updatedAt": "2025-08-03T22:25:22.853Z",
    "avatarEmoji": "😊"
  },
  {
    "id": "f67649b5-cfd0-4bcb-b22c-e5daa558b03d",
    "name": "Herr Kowalski",
    "loginCode": "TEACH002",
    "role": "TEACHER",
    "createdAt": "2025-07-29T20:07:41.021Z",
    "updatedAt": "2025-07-29T20:07:41.021Z",
    "avatarEmoji": null
  },
  {
    "id": "9fe8b6f8-5a76-48ee-bfd3-51f2c114dee2",
    "name": "Josefine Baierl",
    "loginCode": "STUD002",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.038Z",
    "updatedAt": "2025-08-03T22:27:06.122Z",
    "avatarEmoji": "🧙‍♂️"
  },
  {
    "id": "c10279e5-5586-4c2a-a39f-288ae4bf7f69",
    "name": "Friederike Bremser",
    "loginCode": "STUD003",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.039Z",
    "updatedAt": "2025-08-03T22:27:20.898Z",
    "avatarEmoji": "🐛"
  },
  {
    "id": "634f0240-954b-4799-ad51-ef349f93050b",
    "name": "Jonathan Dillmann",
    "loginCode": "STUD004",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.040Z",
    "updatedAt": "2025-08-03T22:27:33.276Z",
    "avatarEmoji": "🐌"
  },
  {
    "id": "bf106cab-4261-4264-b8ae-6bf3df4e1989",
    "name": "Jasmin Farnung",
    "loginCode": "STUD005",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.041Z",
    "updatedAt": "2025-08-03T22:27:44.677Z",
    "avatarEmoji": "🧞‍♀️"
  },
  {
    "id": "d53ee972-3396-4cc2-a6e9-14b7fc24eb54",
    "name": "Marlene Geis",
    "loginCode": "STUD006",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.041Z",
    "updatedAt": "2025-08-03T22:27:53.974Z",
    "avatarEmoji": "🧝‍♂️"
  },
  {
    "id": "459fc2c2-5b97-46a6-93d1-82ed430e828d",
    "name": "Louis Gerharz",
    "loginCode": "STUD007",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.042Z",
    "updatedAt": "2025-08-03T22:28:05.520Z",
    "avatarEmoji": "🧌"
  },
  {
    "id": "74e89399-f46b-41c6-ad6b-bcb06bf0a449",
    "name": "Luise Habach",
    "loginCode": "STUD008",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.044Z",
    "updatedAt": "2025-08-03T22:28:12.693Z",
    "avatarEmoji": "🧞‍♀️"
  },
  {
    "id": "331c4df7-26ec-4ea2-b756-81a408317d9b",
    "name": "Hannah Hagedorn",
    "loginCode": "STUD009",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.045Z",
    "updatedAt": "2025-08-03T22:26:06.873Z",
    "avatarEmoji": "👩‍🌾"
  },
  {
    "id": "359611d5-7441-4015-8572-38dc77b557a1",
    "name": "Kilian Jahnke",
    "loginCode": "STUD010",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.046Z",
    "updatedAt": "2025-08-03T22:26:16.897Z",
    "avatarEmoji": "👨‍🚀"
  },
  {
    "id": "37942bea-1eee-407e-8816-54beb08ac2a1",
    "name": "Marlene Krall",
    "loginCode": "STUD011",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.047Z",
    "updatedAt": "2025-08-03T22:26:28.186Z",
    "avatarEmoji": "👩‍🎤"
  },
  {
    "id": "b08f382a-0125-494a-93ae-a97b294ad6d6",
    "name": "Robin Maas",
    "loginCode": "STUD012",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.048Z",
    "updatedAt": "2025-08-03T22:26:35.996Z",
    "avatarEmoji": "👿"
  },
  {
    "id": "30ad265d-e41f-4048-abd5-5babf328c700",
    "name": "Jonas Maxeiner",
    "loginCode": "STUD013",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.048Z",
    "updatedAt": "2025-08-03T22:26:42.729Z",
    "avatarEmoji": "🐟"
  },
  {
    "id": "5ff022a3-475a-4394-9d0e-f788df4b43a1",
    "name": "Samuel May",
    "loginCode": "STUD014",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.049Z",
    "updatedAt": "2025-08-03T22:26:49.674Z",
    "avatarEmoji": "🦸‍♀️"
  },
  {
    "id": "a29225ed-0b95-4de5-b91f-11f2af0f4daa",
    "name": "Dennis Miller",
    "loginCode": "STUD015",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.051Z",
    "updatedAt": "2025-08-03T21:05:32.460Z",
    "avatarEmoji": null
  },
  {
    "id": "7ea63607-b859-4703-b2c2-b025a42389e2",
    "name": "Miró Mohr",
    "loginCode": "STUD016",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.052Z",
    "updatedAt": "2025-08-03T22:28:30.196Z",
    "avatarEmoji": "🐵"
  },
  {
    "id": "d866d2a9-a845-4b21-abb6-df3f0f48d3e8",
    "name": "Adela Mureşan",
    "loginCode": "STUD017",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.053Z",
    "updatedAt": "2025-08-03T22:28:36.811Z",
    "avatarEmoji": "🐧"
  },
  {
    "id": "8829e4d5-e609-4fcd-82ca-d6390be42c71",
    "name": "Paul Pfeifer",
    "loginCode": "STUD018",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.055Z",
    "updatedAt": "2025-08-03T22:28:48.414Z",
    "avatarEmoji": "👨‍🎨"
  },
  {
    "id": "2ce55242-4d3d-438d-a305-98b1b148408e",
    "name": "Louisa Plattes",
    "loginCode": "STUD019",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.056Z",
    "updatedAt": "2025-08-03T22:28:55.864Z",
    "avatarEmoji": "👩‍✈️"
  },
  {
    "id": "4723e20b-7928-4cfb-b184-2b4ef1c91594",
    "name": "Arthur Potemkin",
    "loginCode": "STUD020",
    "role": "STUDENT",
    "createdAt": "2025-07-29T20:07:41.057Z",
    "updatedAt": "2025-08-03T22:29:02.743Z",
    "avatarEmoji": "🐻"
  },
  {
    "id": "4b09f68d-a1cd-4a5a-9cf8-e30d2732942e",
    "name": "Jakob Ackermann",
    "loginCode": "STUD001",
    "role": "STUDENT",
    "createdAt": "2025-08-02T19:59:20.572Z",
    "updatedAt": "2025-08-03T22:26:59.451Z",
    "avatarEmoji": "👨‍🎤"
  },
  {
    "id": "2b81ce9e-f697-4677-b6cf-6cac3db844da",
    "name": "Julia Reiners",
    "loginCode": "STUD021",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:04:33.587Z",
    "updatedAt": "2025-08-03T22:29:14.080Z",
    "avatarEmoji": "🐬"
  },
  {
    "id": "d9e0e507-1432-464f-a6ff-cbcb3e2ce35b",
    "name": "Bruno Scavio",
    "loginCode": "STUD022",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:04:33.589Z",
    "updatedAt": "2025-08-03T22:29:20.110Z",
    "avatarEmoji": "🐙"
  },
  {
    "id": "33dac493-32e7-4e4e-a267-c3125d10821a",
    "name": "Vincent Schlag",
    "loginCode": "STUD023",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:04:33.590Z",
    "updatedAt": "2025-08-03T22:29:29.024Z",
    "avatarEmoji": "👹"
  },
  {
    "id": "3fcca169-2005-4e19-bea8-79b56a7f67a5",
    "name": "Felix Schmelzlin",
    "loginCode": "STUD024",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:04:33.591Z",
    "updatedAt": "2025-08-03T22:29:38.989Z",
    "avatarEmoji": "👨‍🎭"
  },
  {
    "id": "fa0454e9-acea-472a-b530-1130e1c61cfd",
    "name": "Niklas Schmitz",
    "loginCode": "STUD025",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:04:33.592Z",
    "updatedAt": "2025-08-03T22:29:48.791Z",
    "avatarEmoji": "🧛‍♂️"
  },
  {
    "id": "e986f536-a9e6-49b5-817d-29a5de414d0f",
    "name": "Andreas Thielen",
    "loginCode": "STUD026",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:04:33.593Z",
    "updatedAt": "2025-08-03T22:29:59.183Z",
    "avatarEmoji": "🦚"
  },
  {
    "id": "b3c30888-7797-46f6-b4cb-4ee63bba6dcf",
    "name": "Fabio Urso",
    "loginCode": "STUD027",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:04:33.594Z",
    "updatedAt": "2025-08-03T22:30:18.805Z",
    "avatarEmoji": "😈"
  },
  {
    "id": "266d9abf-794d-4096-9c68-7bff58245aec",
    "name": "Lennas Weinem",
    "loginCode": "STUD028",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:04:33.595Z",
    "updatedAt": "2025-08-03T22:30:27.843Z",
    "avatarEmoji": "🤖"
  },
  {
    "id": "0d92033b-bf1f-4ea1-9012-99f8eadded43",
    "name": "Nils Weiß",
    "loginCode": "STUD029",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:04:33.596Z",
    "updatedAt": "2025-08-03T22:30:38.515Z",
    "avatarEmoji": "🤖"
  },
  {
    "id": "a1d1dc91-63e7-404f-a63c-97f8763a4fe2",
    "name": "Jan Wimmershoff",
    "loginCode": "STUD030",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:04:33.597Z",
    "updatedAt": "2025-08-03T22:30:53.907Z",
    "avatarEmoji": "🧟‍♂️"
  },
  {
    "id": "b3841f96-70ec-4ebe-aee1-01701451f66a",
    "name": "Freya Zipper",
    "loginCode": "STUD031",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:04:33.598Z",
    "updatedAt": "2025-08-03T22:31:19.364Z",
    "avatarEmoji": "🐼"
  },
  {
    "id": "73f8cfb2-c47f-47fd-8d24-b4cbd01cd518",
    "name": "Laura Braun",
    "loginCode": "STUD019_ORIG",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:10:10.088Z",
    "updatedAt": "2025-08-03T21:10:10.088Z",
    "avatarEmoji": null
  },
  {
    "id": "19d5fb17-377a-41cc-8c54-43f893feaf8e",
    "name": "Lea Bauer",
    "loginCode": "STUD013_ORIG",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:10:10.090Z",
    "updatedAt": "2025-08-03T21:10:10.090Z",
    "avatarEmoji": null
  },
  {
    "id": "bbc64e54-b489-4aaa-97ba-c4949c2819ae",
    "name": "Martin Bindewald",
    "loginCode": "STUD032",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.555Z",
    "updatedAt": "2025-08-03T21:31:37.034Z",
    "avatarEmoji": null
  },
  {
    "id": "b4419672-b2f8-402c-8a1c-52253e6a5067",
    "name": "Laureen Budka",
    "loginCode": "STUD033",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.556Z",
    "updatedAt": "2025-08-03T21:31:37.036Z",
    "avatarEmoji": null
  },
  {
    "id": "0ad59b7c-6c2d-44b2-a8d2-6e207781c5e7",
    "name": "Benjamin Clos",
    "loginCode": "STUD034",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.557Z",
    "updatedAt": "2025-08-03T21:31:37.037Z",
    "avatarEmoji": null
  },
  {
    "id": "9b417759-b1cb-4a92-bb32-e2510d7b1575",
    "name": "Justus Damm",
    "loginCode": "STUD035",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.558Z",
    "updatedAt": "2025-08-03T21:31:37.038Z",
    "avatarEmoji": null
  },
  {
    "id": "0eb2aeda-09f6-40ca-b2c3-60b18737e61d",
    "name": "Stipe Drmic",
    "loginCode": "STUD036",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.559Z",
    "updatedAt": "2025-08-03T21:31:37.039Z",
    "avatarEmoji": null
  },
  {
    "id": "4408af74-4592-4d64-8060-13956d5c0a4b",
    "name": "Aaron Herrenkind",
    "loginCode": "STUD037",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.560Z",
    "updatedAt": "2025-08-03T21:31:37.040Z",
    "avatarEmoji": null
  },
  {
    "id": "c9095bc2-ec8d-4e6c-bf35-98c9cdc10e81",
    "name": "Nikita Kling",
    "loginCode": "STUD038",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.561Z",
    "updatedAt": "2025-08-03T21:31:37.041Z",
    "avatarEmoji": null
  },
  {
    "id": "1f073b27-d3bb-49f0-bbe4-61d55f4a9585",
    "name": "Alex Koch",
    "loginCode": "STUD039",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.562Z",
    "updatedAt": "2025-08-03T21:31:37.042Z",
    "avatarEmoji": null
  },
  {
    "id": "007bb4b3-dc86-4996-99ac-9f712880be63",
    "name": "Erich König",
    "loginCode": "STUD040",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.563Z",
    "updatedAt": "2025-08-03T21:31:37.043Z",
    "avatarEmoji": null
  },
  {
    "id": "e51e14b0-66a5-4a61-a19e-6dec36f07cb5",
    "name": "Tom Kup",
    "loginCode": "STUD041",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.564Z",
    "updatedAt": "2025-08-03T21:31:37.044Z",
    "avatarEmoji": null
  },
  {
    "id": "6d88244d-18fe-478b-ac69-8e1b9418a734",
    "name": "Helge Nebendahl",
    "loginCode": "STUD042",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.565Z",
    "updatedAt": "2025-08-03T22:45:13.566Z",
    "avatarEmoji": "👩‍🚒"
  },
  {
    "id": "530fee57-6c45-42af-abd7-c51a742fde41",
    "name": "Janic Schaaf",
    "loginCode": "STUD043",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.566Z",
    "updatedAt": "2025-08-03T21:31:37.045Z",
    "avatarEmoji": null
  },
  {
    "id": "cb2086a0-3ac2-4c5d-a0f8-7d671ed3d158",
    "name": "Sophie Schaaf",
    "loginCode": "STUD044",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.567Z",
    "updatedAt": "2025-08-03T21:31:37.046Z",
    "avatarEmoji": null
  },
  {
    "id": "9f0bab97-72ae-490a-97e8-8d55de7b6217",
    "name": "Louis Scheerer",
    "loginCode": "STUD045",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.568Z",
    "updatedAt": "2025-08-03T21:31:37.047Z",
    "avatarEmoji": null
  },
  {
    "id": "3d58905c-7d17-4b9a-93ec-11bbc2b24b9d",
    "name": "Jana Schiffer",
    "loginCode": "STUD046",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.569Z",
    "updatedAt": "2025-08-03T21:31:37.048Z",
    "avatarEmoji": null
  },
  {
    "id": "3588315a-a57e-4d27-8ec4-8e87714caece",
    "name": "Wiebke Schmidt",
    "loginCode": "STUD047",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.569Z",
    "updatedAt": "2025-08-03T21:31:37.048Z",
    "avatarEmoji": null
  },
  {
    "id": "14e28c99-888e-4581-9386-fdad3be79415",
    "name": "Julius Schöning",
    "loginCode": "STUD048",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.570Z",
    "updatedAt": "2025-08-03T21:31:37.049Z",
    "avatarEmoji": null
  },
  {
    "id": "979152b3-4e43-4710-b5dc-3d014b96e795",
    "name": "Duy Anh Trân",
    "loginCode": "STUD049",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.570Z",
    "updatedAt": "2025-08-03T21:31:37.049Z",
    "avatarEmoji": null
  },
  {
    "id": "2b43da98-c067-4e6f-b1d0-4184e9abc5d9",
    "name": "Paul Ulrich",
    "loginCode": "STUD050",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.571Z",
    "updatedAt": "2025-08-03T21:31:37.050Z",
    "avatarEmoji": null
  },
  {
    "id": "00e860f5-2ebf-4217-8418-ed5198a11e38",
    "name": "Jasper Wagner",
    "loginCode": "STUD051",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.571Z",
    "updatedAt": "2025-08-03T21:31:37.050Z",
    "avatarEmoji": null
  },
  {
    "id": "567961b6-7109-46b2-a17f-0b9580621a61",
    "name": "Julian Weitz",
    "loginCode": "STUD052",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.572Z",
    "updatedAt": "2025-08-03T21:31:37.051Z",
    "avatarEmoji": null
  },
  {
    "id": "14f17127-552f-4356-95ac-f6d32aec0d0e",
    "name": "Lukas Wetzlar",
    "loginCode": "STUD053",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.572Z",
    "updatedAt": "2025-08-03T21:31:37.051Z",
    "avatarEmoji": null
  },
  {
    "id": "586e65a3-ec61-4884-adde-045e7a0ad0d6",
    "name": "Jakob Weyerhäuser",
    "loginCode": "STUD054",
    "role": "STUDENT",
    "createdAt": "2025-08-03T21:27:54.573Z",
    "updatedAt": "2025-08-03T21:31:37.052Z",
    "avatarEmoji": null
  },
  {
    "id": "a88b3d82-8481-4a8b-9a6f-1e566c188c19",
    "name": "Nathan Krämer",
    "loginCode": "STUD055",
    "role": "STUDENT",
    "createdAt": "2025-08-03T22:20:06.289Z",
    "updatedAt": "2025-08-03T22:20:06.289Z",
    "avatarEmoji": null
  },
  {
    "id": "f9294593-ecb5-4ba6-831a-cb2b2367a0a4",
    "name": "Grace Krämer",
    "loginCode": "STUD056",
    "role": "STUDENT",
    "createdAt": "2025-08-03T22:20:06.292Z",
    "updatedAt": "2025-08-03T22:20:06.292Z",
    "avatarEmoji": null
  },
  {
    "id": "1fb5b17d-3515-4185-a1c7-b643b1e54af4",
    "name": "Samuel Krämer",
    "loginCode": "STUD057",
    "role": "STUDENT",
    "createdAt": "2025-08-03T22:20:06.293Z",
    "updatedAt": "2025-08-03T22:20:06.293Z",
    "avatarEmoji": null
  }
];
  for (const user of users) {
    await prisma.user.create({ data: user });
  }
  console.log(`Created ${users.length} users`);

  // LearningGroup
  const learningGroups = [
  {
    "id": "8000d012-758d-4191-b47c-cc8816e88eba",
    "name": "Klasse 7a",
    "createdAt": "2025-07-29T20:07:41.035Z",
    "updatedAt": "2025-08-03T20:49:04.676Z",
    "teacherId": "01ed6e10-397e-446c-9254-2ad7fd4ec777"
  },
  {
    "id": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "name": "Informatik GK 12",
    "createdAt": "2025-07-29T20:07:41.036Z",
    "updatedAt": "2025-07-29T20:49:36.703Z",
    "teacherId": "01ed6e10-397e-446c-9254-2ad7fd4ec777"
  },
  {
    "id": "00925604-78f6-4363-ba6f-265101a8d678",
    "name": "Klasse 10c",
    "createdAt": "2025-08-03T21:12:27.731Z",
    "updatedAt": "2025-08-03T21:12:27.731Z",
    "teacherId": "f67649b5-cfd0-4bcb-b22c-e5daa558b03d"
  },
  {
    "id": "9b7cee71-c63a-4801-b9a8-4a1e754b2211",
    "name": "Klasse 6a",
    "createdAt": "2025-08-04T21:44:10.138Z",
    "updatedAt": "2025-08-04T21:44:10.138Z",
    "teacherId": "01ed6e10-397e-446c-9254-2ad7fd4ec777"
  },
  {
    "id": "07d9ab36-52d8-4a33-808c-6e3dddeffe7b",
    "name": "GK11",
    "createdAt": "2025-08-04T21:44:10.143Z",
    "updatedAt": "2025-08-04T21:44:10.143Z",
    "teacherId": "01ed6e10-397e-446c-9254-2ad7fd4ec777"
  }
];
  for (const group of learningGroups) {
    await prisma.learningGroup.create({ data: group });
  }
  console.log(`Created ${learningGroups.length} learning groups`);

  // Subject
  const subjects = [
  {
    "id": "59693f42-a733-442c-b745-5a1148da8d7c",
    "name": "Mathematik",
    "description": "Mathematik für Klasse 6a",
    "order": 0,
    "teacherId": "01ed6e10-397e-446c-9254-2ad7fd4ec777",
    "createdAt": "2025-07-29T20:07:41.023Z",
    "updatedAt": "2025-07-29T20:07:41.023Z"
  },
  {
    "id": "63d3a6d0-a7d1-496b-beb4-ea222a0831ed",
    "name": "Informatik",
    "description": "Informatik für GK11",
    "order": 1,
    "teacherId": "01ed6e10-397e-446c-9254-2ad7fd4ec777",
    "createdAt": "2025-07-29T20:07:41.024Z",
    "updatedAt": "2025-07-29T20:07:41.024Z"
  }
];
  for (const subject of subjects) {
    await prisma.subject.create({ data: subject });
  }
  console.log(`Created ${subjects.length} subjects`);

  // Block
  const blocks = [
  {
    "id": "7e6883c6-1ded-489d-9c34-3e5e5c0ef20d",
    "name": "Klasse 7",
    "description": null,
    "order": 0,
    "subjectId": "59693f42-a733-442c-b745-5a1148da8d7c",
    "createdAt": "2025-07-29T20:58:58.579Z",
    "updatedAt": "2025-07-30T09:38:59.397Z"
  },
  {
    "id": "cc755c84-0be3-4ece-99c8-9a3bf2ce219e",
    "name": "MSS: Grundthemen",
    "description": null,
    "order": 0,
    "subjectId": "63d3a6d0-a7d1-496b-beb4-ea222a0831ed",
    "createdAt": "2025-07-30T09:52:15.993Z",
    "updatedAt": "2025-07-30T09:52:43.148Z"
  },
  {
    "id": "225dc96d-8ff1-4539-9461-bc0242dda06a",
    "name": "MSS: Wahl- und Projektthemen",
    "description": null,
    "order": 0,
    "subjectId": "63d3a6d0-a7d1-496b-beb4-ea222a0831ed",
    "createdAt": "2025-07-30T09:52:37.728Z",
    "updatedAt": "2025-07-30T09:52:37.728Z"
  }
];
  for (const block of blocks) {
    await prisma.block.create({ data: block });
  }
  console.log(`Created ${blocks.length} blocks`);

  // Unit
  const units = [
  {
    "id": "af62b3a9-48fa-4874-8fcb-5aeed31ed154",
    "name": "Ganze und rationale Zahlen (Kapitel 5)",
    "description": null,
    "order": 0,
    "blockId": "7e6883c6-1ded-489d-9c34-3e5e5c0ef20d",
    "createdAt": "2025-07-29T20:59:13.762Z",
    "updatedAt": "2025-07-30T09:47:31.657Z"
  },
  {
    "id": "3883ccf7-35ec-4abe-9009-75168ace4b8e",
    "name": "Daten und Zufall (Kapitel 4)",
    "description": null,
    "order": 0,
    "blockId": "7e6883c6-1ded-489d-9c34-3e5e5c0ef20d",
    "createdAt": "2025-07-30T09:41:36.224Z",
    "updatedAt": "2025-07-30T09:42:53.228Z"
  },
  {
    "id": "5998d206-044c-4ab1-bd74-59b54ca64f16",
    "name": "Informatik = Information?",
    "description": null,
    "order": 0,
    "blockId": "cc755c84-0be3-4ece-99c8-9a3bf2ce219e",
    "createdAt": "2025-07-30T09:53:21.523Z",
    "updatedAt": "2025-07-30T09:54:12.807Z"
  },
  {
    "id": "6ec37a12-e944-4019-b95d-692a3d9d08f1",
    "name": "3D Druck",
    "description": null,
    "order": 0,
    "blockId": "225dc96d-8ff1-4539-9461-bc0242dda06a",
    "createdAt": "2025-07-30T09:55:34.746Z",
    "updatedAt": "2025-07-30T09:55:34.746Z"
  },
  {
    "id": "ac6693b0-fd49-4614-8460-6f8c0584e94f",
    "name": "Grundlagen",
    "description": null,
    "order": 0,
    "blockId": "cc755c84-0be3-4ece-99c8-9a3bf2ce219e",
    "createdAt": "2025-08-03T21:21:40.222Z",
    "updatedAt": "2025-08-03T21:21:40.222Z"
  },
  {
    "id": "f3728500-e62e-4634-a6c5-15c96bb9b125",
    "name": "Datenbanken",
    "description": null,
    "order": 0,
    "blockId": "cc755c84-0be3-4ece-99c8-9a3bf2ce219e",
    "createdAt": "2025-08-03T22:20:06.295Z",
    "updatedAt": "2025-08-03T22:20:06.295Z"
  },
  {
    "id": "bd5d4d6e-5a3c-4d5e-8d29-d9f640887ea7",
    "name": "Algorithmen und Datenstrukturen",
    "description": null,
    "order": 1,
    "blockId": "cc755c84-0be3-4ece-99c8-9a3bf2ce219e",
    "createdAt": "2025-08-03T22:20:06.296Z",
    "updatedAt": "2025-08-03T22:20:06.296Z"
  },
  {
    "id": "8250fc77-9fdc-45ef-b434-35532f6cdf81",
    "name": "Objektorientierte Programmierung",
    "description": null,
    "order": 2,
    "blockId": "cc755c84-0be3-4ece-99c8-9a3bf2ce219e",
    "createdAt": "2025-08-03T22:20:06.296Z",
    "updatedAt": "2025-08-03T22:20:06.296Z"
  },
  {
    "id": "16640628-057b-450d-8074-a92d26d84e3c",
    "name": "Webentwicklung",
    "description": null,
    "order": 0,
    "blockId": "225dc96d-8ff1-4539-9461-bc0242dda06a",
    "createdAt": "2025-08-03T22:20:06.297Z",
    "updatedAt": "2025-08-03T22:20:06.297Z"
  }
];
  for (const unit of units) {
    await prisma.unit.create({ data: unit });
  }
  console.log(`Created ${units.length} units`);

  // Topic
  const topics = [
  {
    "id": "35c8a998-8bd6-4885-8d61-f9856e0caf8f",
    "name": "Unser Grundwissen ... ",
    "description": null,
    "order": 0,
    "unitId": "af62b3a9-48fa-4874-8fcb-5aeed31ed154",
    "createdAt": "2025-07-29T20:59:40.623Z",
    "updatedAt": "2025-07-30T09:39:22.021Z"
  },
  {
    "id": "ca7f602b-b735-446b-adca-da725cbd03ba",
    "name": "Stichproben (4.1)",
    "description": null,
    "order": 0,
    "unitId": "3883ccf7-35ec-4abe-9009-75168ace4b8e",
    "createdAt": "2025-07-30T09:48:18.227Z",
    "updatedAt": "2025-07-30T09:48:18.227Z"
  },
  {
    "id": "216c4085-36e6-41b7-9665-ad3c81af1b8c",
    "name": "Median (4.2)",
    "description": null,
    "order": 0,
    "unitId": "3883ccf7-35ec-4abe-9009-75168ace4b8e",
    "createdAt": "2025-07-30T09:48:32.768Z",
    "updatedAt": "2025-07-30T09:48:32.768Z"
  },
  {
    "id": "15e87553-ffe1-4d45-9a71-1e078677f168",
    "name": "Streuung (4.3)",
    "description": null,
    "order": 0,
    "unitId": "3883ccf7-35ec-4abe-9009-75168ace4b8e",
    "createdAt": "2025-07-30T09:48:41.557Z",
    "updatedAt": "2025-07-30T09:48:41.557Z"
  },
  {
    "id": "19be3a1a-6b75-4a16-bf98-305d029e04a7",
    "name": "Zufallsexperimente (4.4 und 4.5)",
    "description": null,
    "order": 0,
    "unitId": "3883ccf7-35ec-4abe-9009-75168ace4b8e",
    "createdAt": "2025-07-30T09:49:09.985Z",
    "updatedAt": "2025-07-30T09:49:09.985Z"
  },
  {
    "id": "867fa1e6-1baf-4132-83e2-a3c0b90251cf",
    "name": "Ereignisse (4.6)",
    "description": null,
    "order": 0,
    "unitId": "3883ccf7-35ec-4abe-9009-75168ace4b8e",
    "createdAt": "2025-07-30T09:49:39.934Z",
    "updatedAt": "2025-07-30T09:49:39.934Z"
  },
  {
    "id": "7ae8592c-5973-44d7-a51d-efe524237546",
    "name": "Blickpunkt Regen",
    "description": null,
    "order": 0,
    "unitId": "3883ccf7-35ec-4abe-9009-75168ace4b8e",
    "createdAt": "2025-07-30T09:49:53.332Z",
    "updatedAt": "2025-07-30T09:49:53.332Z"
  },
  {
    "id": "19ccb2bf-e4f1-441c-81cd-df776b6d994d",
    "name": "Informationen in verschiedenen Dastellungsformen",
    "description": null,
    "order": 0,
    "unitId": "5998d206-044c-4ab1-bd74-59b54ca64f16",
    "createdAt": "2025-07-30T09:53:40.372Z",
    "updatedAt": "2025-07-30T09:53:40.372Z"
  },
  {
    "id": "fc59e18a-c014-49e5-99ca-f2684c4478db",
    "name": "Grundlagen",
    "description": null,
    "order": 0,
    "unitId": "6ec37a12-e944-4019-b95d-692a3d9d08f1",
    "createdAt": "2025-07-30T09:55:43.481Z",
    "updatedAt": "2025-07-30T09:55:43.481Z"
  },
  {
    "id": "fa9fecd0-174c-47f1-85d8-9d2e57fe7417",
    "name": "Der erste Druck",
    "description": null,
    "order": 0,
    "unitId": "6ec37a12-e944-4019-b95d-692a3d9d08f1",
    "createdAt": "2025-07-30T09:57:33.785Z",
    "updatedAt": "2025-07-30T09:57:33.785Z"
  },
  {
    "id": "e8198846-045a-4a04-9de2-ece43ac2f0e8",
    "name": "Grundlagen",
    "description": null,
    "order": 0,
    "unitId": "ac6693b0-fd49-4614-8460-6f8c0584e94f",
    "createdAt": "2025-08-03T21:21:40.223Z",
    "updatedAt": "2025-08-03T21:21:40.223Z"
  },
  {
    "id": "3126e683-8b56-4201-a110-e85dfc32836b",
    "name": "Positive und negative Zahlen",
    "description": null,
    "order": 0,
    "unitId": "af62b3a9-48fa-4874-8fcb-5aeed31ed154",
    "createdAt": "2025-08-03T22:20:06.298Z",
    "updatedAt": "2025-08-03T22:20:06.298Z"
  },
  {
    "id": "4af9e929-666e-41e5-afa1-1d4d69143195",
    "name": "SQL Grundlagen",
    "description": null,
    "order": 0,
    "unitId": "f3728500-e62e-4634-a6c5-15c96bb9b125",
    "createdAt": "2025-08-03T22:20:06.299Z",
    "updatedAt": "2025-08-03T22:20:06.299Z"
  },
  {
    "id": "1902356e-0cf7-43b9-b271-2de1fce281c8",
    "name": "Datenbankdesign",
    "description": null,
    "order": 1,
    "unitId": "f3728500-e62e-4634-a6c5-15c96bb9b125",
    "createdAt": "2025-08-03T22:20:06.299Z",
    "updatedAt": "2025-08-03T22:20:06.299Z"
  },
  {
    "id": "db3f7668-e7bf-45ce-b93f-82c9e3d11f96",
    "name": "Sortieralgorithmen",
    "description": null,
    "order": 0,
    "unitId": "bd5d4d6e-5a3c-4d5e-8d29-d9f640887ea7",
    "createdAt": "2025-08-03T22:20:06.300Z",
    "updatedAt": "2025-08-03T22:20:06.300Z"
  },
  {
    "id": "008ea236-dbc0-421e-a1f8-0d770e667d90",
    "name": "Klassen und Objekte",
    "description": null,
    "order": 0,
    "unitId": "8250fc77-9fdc-45ef-b434-35532f6cdf81",
    "createdAt": "2025-08-03T22:20:06.300Z",
    "updatedAt": "2025-08-03T22:20:06.300Z"
  },
  {
    "id": "6e339b2a-5e8e-4a83-a72d-c5e07dbdcc38",
    "name": "HTML und CSS",
    "description": null,
    "order": 0,
    "unitId": "16640628-057b-450d-8074-a92d26d84e3c",
    "createdAt": "2025-08-03T22:20:06.301Z",
    "updatedAt": "2025-08-03T22:20:06.301Z"
  }
];
  for (const topic of topics) {
    await prisma.topic.create({ data: topic });
  }
  console.log(`Created ${topics.length} topics`);

  // Note
  const notes = [
  {
    "id": "8855a44a-f3d9-4424-8221-8cebb82abe25",
    "title": "Prompts",
    "content": "Eine neue Frage beginnt immer mit einem Listenpunkt. Die möglichen Antworten darunter sind mit a), b) etc. bezeichnet. Die erste Antwort ist immer die richtige.",
    "authorId": "01ed6e10-397e-446c-9254-2ad7fd4ec777",
    "isPrivate": true,
    "tags": "#4CAF50",
    "order": 2,
    "createdAt": "2025-07-29T20:08:50.280Z",
    "updatedAt": "2025-07-29T20:45:39.156Z"
  },
  {
    "id": "b0c3f1fa-342f-49e9-a59a-db45aa2f5a16",
    "title": "ChatGPT für Quizze",
    "content": "TODO",
    "authorId": "01ed6e10-397e-446c-9254-2ad7fd4ec777",
    "isPrivate": true,
    "tags": "#E91E63",
    "order": 1,
    "createdAt": "2025-07-29T20:09:07.531Z",
    "updatedAt": "2025-07-29T20:45:39.154Z"
  },
  {
    "id": "de095bec-f891-4252-a23e-616a3796a432",
    "title": "Und noch ein Test",
    "content": "aegawegaergaergerg",
    "authorId": "01ed6e10-397e-446c-9254-2ad7fd4ec777",
    "isPrivate": true,
    "tags": "#795548",
    "order": 0,
    "createdAt": "2025-07-29T20:45:12.673Z",
    "updatedAt": "2025-07-29T20:45:39.150Z"
  },
  {
    "id": "f2dfdc1e-8117-4fbb-aba0-11f8755ef481",
    "title": "Git",
    "content": "Bitte setze einen Checkpoint. Git Commit, Git Push auch für die Datenbank. Pushe auch ein Datenbank-Backup.",
    "authorId": "01ed6e10-397e-446c-9254-2ad7fd4ec777",
    "isPrivate": true,
    "tags": "#2196F3",
    "order": 3,
    "createdAt": "2025-07-30T22:26:59.459Z",
    "updatedAt": "2025-07-30T22:26:59.459Z"
  }
];
  for (const note of notes) {
    await prisma.note.create({ data: note });
  }
  console.log(`Created ${notes.length} notes`);

  // Material
  const materials = [
  {
    "id": "aa3383f2-aea2-4d31-b4c5-26e9ff0fec91",
    "fileName": "3D-Druck-Intro.html",
    "filePath": "/material/3D-Druck-Intro.html",
    "type": "html",
    "createdAt": "2025-07-30T10:07:32.029Z",
    "updatedAt": "2025-07-30T10:07:32.029Z"
  },
  {
    "id": "e5349bc2-a0a8-488a-a20c-2d21862415ae",
    "fileName": "3D-Druck-Fertig.html",
    "filePath": "/material/3D-Druck-Fertig.html",
    "type": "html",
    "createdAt": "2025-07-30T10:08:25.382Z",
    "updatedAt": "2025-07-30T10:08:25.382Z"
  },
  {
    "id": "cb416b17-928f-448d-b618-0bc25909f73a",
    "fileName": "quiz-morse-bar-qr.html",
    "filePath": "/material/quiz-morse-bar-qr.html",
    "type": "html",
    "createdAt": "2025-07-30T10:14:44.220Z",
    "updatedAt": "2025-07-30T10:14:44.220Z"
  },
  {
    "id": "bd8e3386-a044-43fc-99f9-9262e24dd6d6",
    "fileName": "qr-timeline-finder-integriert.html",
    "filePath": "/material/qr-timeline-finder-integriert.html",
    "type": "html",
    "createdAt": "2025-07-30T10:15:17.768Z",
    "updatedAt": "2025-07-30T10:15:17.768Z"
  }
];
  for (const material of materials) {
    await prisma.material.create({ data: material });
  }
  console.log(`Created ${materials.length} materials`);

  // Lesson
  const lessons = [
  {
    "id": "db705e42-21bb-47ce-b031-6c02886e410f",
    "name": "Sommeraufgaben zur Wiederholung",
    "description": null,
    "order": 0,
    "topicId": "35c8a998-8bd6-4885-8d61-f9856e0caf8f",
    "createdAt": "2025-07-29T21:00:35.707Z",
    "updatedAt": "2025-07-30T20:24:06.907Z"
  },
  {
    "id": "f21a8e7e-233f-4461-8baf-0fa13529b64a",
    "name": "Mehr Sommeraufgaben zum Üben",
    "description": null,
    "order": 0,
    "topicId": "35c8a998-8bd6-4885-8d61-f9856e0caf8f",
    "createdAt": "2025-07-30T09:40:11.478Z",
    "updatedAt": "2025-07-30T09:40:11.478Z"
  },
  {
    "id": "947cbfc3-fd8f-4c8e-82af-0dadc4e60508",
    "name": "Wetterapps",
    "description": null,
    "order": 0,
    "topicId": "7ae8592c-5973-44d7-a51d-efe524237546",
    "createdAt": "2025-07-30T09:51:18.946Z",
    "updatedAt": "2025-07-30T09:51:18.946Z"
  },
  {
    "id": "681845d0-8811-45ad-8b0f-8f2f9386e06f",
    "name": "Übungen zum Wetter",
    "description": null,
    "order": 0,
    "topicId": "7ae8592c-5973-44d7-a51d-efe524237546",
    "createdAt": "2025-07-30T09:51:34.695Z",
    "updatedAt": "2025-07-30T09:51:34.695Z"
  },
  {
    "id": "4ec32f6f-d184-4251-943f-731414dcc9da",
    "name": "Über weite Entfernungen",
    "description": null,
    "order": 0,
    "topicId": "19ccb2bf-e4f1-441c-81cd-df776b6d994d",
    "createdAt": "2025-07-30T09:54:33.418Z",
    "updatedAt": "2025-07-30T09:54:45.319Z"
  },
  {
    "id": "ca179b61-0c10-433f-8493-6024a9d5e87b",
    "name": "Kühe und Sand",
    "description": null,
    "order": 0,
    "topicId": "19ccb2bf-e4f1-441c-81cd-df776b6d994d",
    "createdAt": "2025-07-30T09:55:14.509Z",
    "updatedAt": "2025-07-30T09:55:14.509Z"
  },
  {
    "id": "537f5fa6-c8b7-4024-a6d4-e1c3de55f673",
    "name": "Go?",
    "description": null,
    "order": 0,
    "topicId": "19ccb2bf-e4f1-441c-81cd-df776b6d994d",
    "createdAt": "2025-07-30T09:55:21.095Z",
    "updatedAt": "2025-07-30T09:55:21.095Z"
  },
  {
    "id": "8a659fa7-4de0-4db7-8163-28ece619d862",
    "name": "Blick in die Vergangenheit",
    "description": null,
    "order": 0,
    "topicId": "fc59e18a-c014-49e5-99ca-f2684c4478db",
    "createdAt": "2025-07-30T09:56:12.148Z",
    "updatedAt": "2025-07-30T09:57:11.269Z"
  },
  {
    "id": "6f342d97-18c3-438a-90ce-3b36501393a2",
    "name": "Modellierung",
    "description": null,
    "order": 2,
    "topicId": "fc59e18a-c014-49e5-99ca-f2684c4478db",
    "createdAt": "2025-07-30T09:56:44.312Z",
    "updatedAt": "2025-07-30T09:57:11.272Z"
  },
  {
    "id": "a31f47a8-f822-4dcd-a983-27eb7de46987",
    "name": "Slicing",
    "description": null,
    "order": 3,
    "topicId": "fc59e18a-c014-49e5-99ca-f2684c4478db",
    "createdAt": "2025-07-30T09:56:52.583Z",
    "updatedAt": "2025-07-30T09:57:11.273Z"
  },
  {
    "id": "26c474da-1bda-45e7-88a7-b78490b163c5",
    "name": "Technischer Aufbau",
    "description": null,
    "order": 1,
    "topicId": "fc59e18a-c014-49e5-99ca-f2684c4478db",
    "createdAt": "2025-07-30T09:57:07.419Z",
    "updatedAt": "2025-07-30T09:57:11.271Z"
  },
  {
    "id": "a9a3caed-7d30-4862-a3b7-f9e3cf888ebe",
    "name": "Mini-Aufgabensammlung",
    "description": null,
    "order": 0,
    "topicId": "fa9fecd0-174c-47f1-85d8-9d2e57fe7417",
    "createdAt": "2025-07-30T09:57:55.130Z",
    "updatedAt": "2025-07-30T09:57:55.130Z"
  },
  {
    "id": "160d3b2e-98ae-46e8-ad0e-1140b3e8701d",
    "name": "Checkup",
    "description": null,
    "order": 0,
    "topicId": "19ccb2bf-e4f1-441c-81cd-df776b6d994d",
    "createdAt": "2025-07-30T10:14:07.178Z",
    "updatedAt": "2025-07-30T10:14:07.178Z"
  },
  {
    "id": "636fbfb7-ce64-4e88-93fb-3f61cea426d7",
    "name": "PRÜFUNGSBLOCK",
    "description": null,
    "order": 0,
    "topicId": "35c8a998-8bd6-4885-8d61-f9856e0caf8f",
    "createdAt": "2025-07-30T10:15:56.134Z",
    "updatedAt": "2025-07-30T10:15:56.134Z"
  },
  {
    "id": "6a78e2e7-e51e-4e16-a3ab-9574aed8217e",
    "name": "Einführung: Positive und negative Zahlen",
    "description": null,
    "order": 0,
    "topicId": "3126e683-8b56-4201-a110-e85dfc32836b",
    "createdAt": "2025-08-03T22:20:06.302Z",
    "updatedAt": "2025-08-03T22:20:06.302Z"
  },
  {
    "id": "ea4abd63-d85f-4a3a-acea-018a29f8d369",
    "name": "SQL SELECT",
    "description": null,
    "order": 0,
    "topicId": "4af9e929-666e-41e5-afa1-1d4d69143195",
    "createdAt": "2025-08-03T22:20:06.302Z",
    "updatedAt": "2025-08-03T22:20:06.302Z"
  },
  {
    "id": "e880e6ac-41ea-4a2d-8237-633a4454a0c4",
    "name": "SQL INSERT/UPDATE",
    "description": null,
    "order": 1,
    "topicId": "4af9e929-666e-41e5-afa1-1d4d69143195",
    "createdAt": "2025-08-03T22:20:06.303Z",
    "updatedAt": "2025-08-03T22:20:06.303Z"
  },
  {
    "id": "aa5a60c8-8f48-4ffc-b242-2e35816c349e",
    "name": "ER-Diagramme",
    "description": null,
    "order": 0,
    "topicId": "1902356e-0cf7-43b9-b271-2de1fce281c8",
    "createdAt": "2025-08-03T22:20:06.304Z",
    "updatedAt": "2025-08-03T22:20:06.304Z"
  },
  {
    "id": "fc70e0d8-36bf-4607-9436-4483ce96992e",
    "name": "Bubble Sort",
    "description": null,
    "order": 0,
    "topicId": "db3f7668-e7bf-45ce-b93f-82c9e3d11f96",
    "createdAt": "2025-08-03T22:20:06.306Z",
    "updatedAt": "2025-08-03T22:20:06.306Z"
  },
  {
    "id": "f9ad0cd9-e9b3-4d30-9428-4336e8b96c06",
    "name": "Quick Sort",
    "description": null,
    "order": 1,
    "topicId": "db3f7668-e7bf-45ce-b93f-82c9e3d11f96",
    "createdAt": "2025-08-03T22:20:06.306Z",
    "updatedAt": "2025-08-03T22:20:06.306Z"
  },
  {
    "id": "cd5e105f-b34d-402e-8a9a-6dd00c67b2c6",
    "name": "Klassenkonzept",
    "description": null,
    "order": 0,
    "topicId": "008ea236-dbc0-421e-a1f8-0d770e667d90",
    "createdAt": "2025-08-03T22:20:06.307Z",
    "updatedAt": "2025-08-03T22:20:06.307Z"
  },
  {
    "id": "7e903029-ca06-44dd-8d1d-7f43442a7a71",
    "name": "HTML Grundlagen",
    "description": null,
    "order": 0,
    "topicId": "6e339b2a-5e8e-4a83-a72d-c5e07dbdcc38",
    "createdAt": "2025-08-03T22:20:06.307Z",
    "updatedAt": "2025-08-03T22:20:06.307Z"
  },
  {
    "id": "c613b8bb-42e1-463e-b8f7-b22415d63ed2",
    "name": "CSS Styling",
    "description": null,
    "order": 1,
    "topicId": "6e339b2a-5e8e-4a83-a72d-c5e07dbdcc38",
    "createdAt": "2025-08-03T22:20:06.308Z",
    "updatedAt": "2025-08-03T22:20:06.308Z"
  }
];
  for (const lesson of lessons) {
    await prisma.lesson.create({ data: lesson });
  }
  console.log(`Created ${lessons.length} lessons`);

  // Quiz
  const quizzes = [
  {
    "id": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "title": "Ostern_Boolesche_Algebra_Quiz",
    "description": "Eine neue Frage beginnt immer mit einem Listenpunkt (•, -, *, oder 1.). Die möglichen Antworten darunter sind mit a), b) etc. bezeichnet. Die erste Antwort ist immer die richtige. Unterstützte Dateiformate: .docx, .doc, .txt",
    "sourceFile": "/material/Ostern_Boolesche_Algebra_Quiz.docx",
    "shuffleQuestions": true,
    "shuffleAnswers": true,
    "timeLimit": 30,
    "teacherId": "01ed6e10-397e-446c-9254-2ad7fd4ec777",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "title": "Logikquiz",
    "description": "Eine neue Frage beginnt immer mit einem Listenpunkt (•, -, *, oder 1.). Die möglichen Antworten darunter sind mit a), b) etc. bezeichnet. Die erste Antwort ist immer die richtige. Unterstützte Dateiformate: .docx, .doc, .txt",
    "sourceFile": "/material/Logikquiz.docx",
    "shuffleQuestions": true,
    "shuffleAnswers": true,
    "timeLimit": 30,
    "teacherId": "01ed6e10-397e-446c-9254-2ad7fd4ec777",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "957caf31-c945-46ad-bd68-0c6a922401b6",
    "title": "Test Quiz",
    "description": "Ein Test-Quiz",
    "sourceFile": "/material/test-quiz.txt",
    "shuffleQuestions": true,
    "shuffleAnswers": true,
    "timeLimit": 30,
    "teacherId": "01ed6e10-397e-446c-9254-2ad7fd4ec777",
    "createdAt": "2025-07-31T14:49:04.954Z",
    "updatedAt": "2025-07-31T14:50:08.019Z"
  }
];
  for (const quiz of quizzes) {
    await prisma.quiz.create({ data: quiz });
  }
  console.log(`Created ${quizzes.length} quizzes`);

  // QuizQuestion
  const quizQuestions = [
  {
    "id": "6de63963-865c-4881-a206-e9311fa38376",
    "question": "Ein Osterei wird nur gefunden, wenn das Gras niedrig ∧ die Sonne scheint.Wie lautet der passende Term?",
    "correctAnswer": "G ∧ S",
    "options": "[\"G ∧ S\",\"¬G ∨ S\",\"G ∨ S\",\"¬G ∧ ¬S\"]",
    "order": 1,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "aac0de66-eff9-4a72-a001-7513f3803d89",
    "question": "Ein Hase hoppelt nur, wenn keine Katze ∧ kein Regen da ist.Welcher Ausdruck passt?",
    "correctAnswer": "¬K ∧ ¬R",
    "options": "[\"¬K ∧ ¬R\",\"K ∨ R\",\"K ∧ ¬R\",\"¬K ∨ R\"]",
    "order": 2,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "29f8f5cc-4c9e-4f62-bc7a-bb9392518b4c",
    "question": "Welche Wahrheitstabelle gehört zu: A ∨ ¬B?",
    "correctAnswer": "A ",
    "options": " B ",
    "order": null,
    "quizId": " 0 ",
    "createdAt": "1970-01-01T00:00:00.010Z",
    "updatedAt": "1970-01-01T00:00:00.001Z"
  },
  {
    "id": "21c689c8-9902-403b-a5d0-4cd1697a6d09",
    "question": "Ein NAND-Gatter ergibt 0 nur bei…",
    "correctAnswer": "1 ∧ 1",
    "options": "[\"1 ∧ 1\",\"0 ∧ 0\",\"1 ∧ 0\",\"0 ∧ 1\"]",
    "order": 4,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "276535ed-6bfd-4f7d-9474-8c336872b9de",
    "question": "Welche Vereinfachung gilt für: A ∧ (¬A ∨ B)?",
    "correctAnswer": "A ∧ B",
    "options": "[\"A ∧ B\",\"A ∨ B\",\"¬A ∧ B\",\"A ∧ ¬B\"]",
    "order": 5,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "0035c040-f768-4a8c-8836-e45b4af88332",
    "question": "Der Ausdruck ¬(A ∨ B) ist äquivalent zu…",
    "correctAnswer": "¬A ∧ ¬B",
    "options": "[\"¬A ∧ ¬B\",\"¬A ∨ ¬B\",\"A ∧ B\",\"¬(A ∧ B)\"]",
    "order": 6,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "877a9f4f-ad9e-445a-833c-552268b290de",
    "question": "Ein Osternest ist versteckt, wenn (Hecke ∨ Baum) ∧ ¬Sonne.",
    "correctAnswer": "(H ∨ B) ∧ ¬S",
    "options": "[\"(H ∨ B) ∧ ¬S\",\"¬H ∧ ¬B ∧ S\",\"H ∧ B ∧ S\",\"¬H ∨ ¬B ∧ S\"]",
    "order": 7,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "dae3291b-dfe2-43cf-bec6-4bd11fa9b3fc",
    "question": "Was ergibt der Ausdruck: A ∧ ¬C, wenn A=1, B=0, C=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 8,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "e40a1afc-5542-4fd7-bb7c-675b6260d08c",
    "question": "Was ergibt der Ausdruck: A ∨ ¬B, wenn A=1, B=0, C=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 9,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "acae86e2-a82b-466d-aa30-5dd09a17aa10",
    "question": "Was ergibt der Ausdruck: A ∨ ¬B, wenn A=1, B=0, C=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 10,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "d4274c9f-c075-44bf-83d0-2870655e0410",
    "question": "Was ergibt der Ausdruck: C ∧ ¬A, wenn A=1, B=0, C=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 11,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "047ebd2d-5518-4d35-94d2-755e61831af0",
    "question": "Was ergibt der Ausdruck: ¬B ∧ B, wenn A=1, B=0, C=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 12,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "33704cbe-1e7b-4d3c-85b7-052a32ab6a1b",
    "question": "Was ergibt der Ausdruck: ¬A ∧ A, wenn A=1, B=0, C=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 13,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "efcf85bd-dc4e-4364-97c7-f67e42ff1ca0",
    "question": "Was ergibt der Ausdruck: ¬A ∧ A, wenn A=1, B=0, C=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 14,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "e5098efe-2105-4e5c-8fd6-7678b0536adf",
    "question": "Was ergibt der Ausdruck: A ∧ A, wenn A=1, B=0, C=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 15,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "cfc00490-294c-4460-b8c0-5d1738bc9915",
    "question": "Was ergibt der Ausdruck: ¬A ∧ C, wenn A=1, B=0, C=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 16,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "38cce6ef-d309-40fb-a38b-fb2f09cb9f2b",
    "question": "Was ergibt der Ausdruck: A ∧ A, wenn A=1, B=0, C=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 17,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "c399de1b-9167-4291-bac9-c0e560bd8bf3",
    "question": "Was ergibt der Ausdruck: ¬A ∧ B, wenn A=1, B=0, C=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 18,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "986de06c-adca-4bdd-85b1-6cce771645c8",
    "question": "Was ergibt der Ausdruck: ¬A ∨ C, wenn A=1, B=0, C=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 19,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "a3e151ef-32fd-471e-be7a-477d73ef6c30",
    "question": "Was ergibt der Ausdruck: ¬A ∧ ¬A, wenn A=1, B=0, C=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 20,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "1cec458a-19b4-421a-ade6-1d15acccbab9",
    "question": "Was ergibt der Ausdruck: ¬C ∨ ¬A, wenn A=1, B=0, C=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 21,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "7098bec8-1daa-4d92-93d3-992ad464f328",
    "question": "Was ergibt der Ausdruck: C ∨ ¬C, wenn A=1, B=0, C=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 22,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "4c322b35-4fa2-45f2-87d7-7065fc492034",
    "question": "Was ergibt der Ausdruck: A ∧ A, wenn A=1, B=0, C=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 23,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "34812ba5-6dab-4286-9930-15434fa5ce45",
    "question": "Was ergibt der Ausdruck: B ∨ ¬A, wenn A=1, B=0, C=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 24,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "d76d8bc5-62a1-4f7d-8d46-00d2fdc1e5ab",
    "question": "Was ergibt der Ausdruck: ¬B ∧ C, wenn A=1, B=0, C=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 25,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "4f8e5da1-a38b-4b8f-8e89-b677de5a6649",
    "question": "Was ergibt der Ausdruck: ¬B ∧ C, wenn A=1, B=0, C=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 26,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "7cac2a64-e83a-4aef-a656-f6108acf8940",
    "question": "Was ergibt der Ausdruck: ¬B ∨ ¬C, wenn A=1, B=0, C=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 27,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "8184aedd-13b8-46b4-9d2d-5653f5f44347",
    "question": "Was ergibt der Ausdruck: B ∧ C, wenn A=1, B=0, C=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 28,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "b45a6f28-32d0-42cb-977e-0f71bb0595a7",
    "question": "Was ergibt der Ausdruck: C ∨ C, wenn A=1, B=0, C=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 29,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "4f5d3626-d4d9-49e4-9caa-d2dac03c786b",
    "question": "Was ergibt der Ausdruck: ¬C ∧ ¬A, wenn A=1, B=0, C=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 30,
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-30T22:11:17.806Z",
    "updatedAt": "2025-07-30T22:11:17.806Z"
  },
  {
    "id": "1500c009-91f5-4977-92c3-26cbc69d5597",
    "question": "Ein Marienkäfer startet nur, wenn die Sonne scheint ∧ das Blatt trocken ist.Welcher Ausdruck beschreibt das korrekt?",
    "correctAnswer": "S ∧ T",
    "options": "[\"S ∧ T\",\"S ∨ T\",\"¬S ∨ ¬T\",\"¬S ∧ ¬T\"]",
    "order": 1,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "8a4e1ae8-8deb-404e-8679-d5e6abc057a8",
    "question": "Ein Osterhase versteckt Eier nur, wenn es nicht regnet ∧ die Kinder suchen.Welcher Ausdruck passt dazu?",
    "correctAnswer": "¬R ∧ K",
    "options": "[\"¬R ∧ K\",\"R ∨ K\",\"¬R ∨ ¬K\",\"R ∧ K\"]",
    "order": 2,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "db3da14d-5a95-4ab0-82b5-8bc6fc96bbc7",
    "question": "Die Blumen öffnen sich, wenn es warm ist ∨ es geregnet hat.Welche Formel passt?",
    "correctAnswer": "W ∨ R",
    "options": "[\"W ∨ R\",\"¬W ∧ ¬R\",\"W ∧ R\",\"¬W ∨ ¬R\"]",
    "order": 3,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "a4c6b447-3593-4dff-af07-feb38e28ddb6",
    "question": "Ein Vogel zwitschert, wenn keine Katze ∧ kein Regen in Sicht ist.Welche Formel passt?",
    "correctAnswer": "¬K ∧ ¬R",
    "options": "[\"¬K ∧ ¬R\",\"K ∨ R\",\"¬K ∨ R\",\"K ∧ R\"]",
    "order": 4,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "bc50b50f-4503-43a9-8691-7ef4c26cd94b",
    "question": "Der Rasenmäher-Roboter fährt nur bei Sonne ∧ ¬Regen.Wie lautet der Ausdruck?",
    "correctAnswer": "S ∧ ¬R",
    "options": "[\"S ∧ ¬R\",\"¬S ∧ R\",\"S ∨ R\",\"¬S ∨ ¬R\"]",
    "order": 5,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "9071e520-857e-4aa7-89ba-e0ec221891e1",
    "question": "Welche Aussage beschreibt die Schaltung: ¬B ∨ F?(B = Bienenflug, F = Blüten geöffnet)",
    "correctAnswer": "Die Blüten öffnen sich oder die Bienen fliegen nicht.",
    "options": "[\"Die Blüten öffnen sich oder die Bienen fliegen nicht.\",\"Die Blüten öffnen sich nur, wenn die Bienen fliegen.\",\"Nur wenn Bienen fliegen und Blüten geöffnet sind, stimmt der Ausdruck.\",\"Keine Bienen, keine Blüten.\"]",
    "order": 6,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "d431383e-aaa9-4b4b-823d-6910434b1d37",
    "question": "Was ergibt der Ausdruck: K ∨ ¬B bei B=1, F=0, K=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 7,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "09891e54-6fc0-4d13-aba6-bba591b7790f",
    "question": "Was ergibt der Ausdruck: F ∨ K bei B=1, F=0, K=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 8,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "044dd65c-fda4-4d1e-abce-d73b080996c9",
    "question": "Was ergibt der Ausdruck: B ∧ ¬F bei B=1, F=0, K=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 9,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "0ce1db40-2a0a-4226-8be3-ef9552f1e6d6",
    "question": "Was ergibt der Ausdruck: K ∨ K bei B=1, F=0, K=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 10,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "6ddc6a23-ae77-452f-bc1f-769127393f30",
    "question": "Was ergibt der Ausdruck: ¬B ∧ K bei B=1, F=0, K=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 11,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "449404f6-cd17-422f-9dac-7ab2d973243a",
    "question": "Was ergibt der Ausdruck: ¬K ∧ B bei B=1, F=0, K=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 12,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "4e0f0531-e50a-439d-a467-b75ead0c56ef",
    "question": "Was ergibt der Ausdruck: ¬B ∨ B bei B=1, F=0, K=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 13,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "a756291e-5a23-4fb2-975f-98e33b0c9267",
    "question": "Was ergibt der Ausdruck: F ∨ ¬F bei B=1, F=0, K=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 14,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "97af84fe-78fb-4df8-95a5-1ab53b831c4b",
    "question": "Was ergibt der Ausdruck: ¬F ∨ ¬B bei B=1, F=0, K=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 15,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "472b4d54-61b0-42db-82c6-34c729007919",
    "question": "Was ergibt der Ausdruck: K ∧ K bei B=1, F=0, K=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 16,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "d454cfcd-496d-4f5d-82e2-b86787f51291",
    "question": "Was ergibt der Ausdruck: ¬F ∧ ¬F bei B=1, F=0, K=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 17,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "a7e0b0e6-3c31-4d8b-aa92-1b079125e05f",
    "question": "Was ergibt der Ausdruck: F ∧ ¬F bei B=1, F=0, K=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 18,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "dd8a4df9-cc38-40ad-b680-7faf055d700f",
    "question": "Was ergibt der Ausdruck: B ∧ B bei B=1, F=0, K=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 19,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "2f061da0-40ba-4bc5-ae42-62dafba450df",
    "question": "Was ergibt der Ausdruck: F ∧ ¬B bei B=1, F=0, K=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 20,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "6b4d1ed1-d5e9-461b-9411-a18a14fdb6c7",
    "question": "Was ergibt der Ausdruck: ¬K ∧ F bei B=1, F=0, K=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 21,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "90f1e2ab-4778-46f9-9124-3ff6f86be5b2",
    "question": "Was ergibt der Ausdruck: K ∨ ¬K bei B=1, F=0, K=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 22,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "25020e37-b9fc-4d8d-a0b9-55de2eca10e8",
    "question": "Was ergibt der Ausdruck: F ∧ B bei B=1, F=0, K=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 23,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "a8d33a9d-f690-4adb-9d63-b51221c68fd9",
    "question": "Was ergibt der Ausdruck: B ∨ F bei B=1, F=0, K=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 24,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "039c1d78-0b60-42d0-b2ef-deebfdaa6f6d",
    "question": "Was ergibt der Ausdruck: ¬K ∨ ¬F bei B=1, F=0, K=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 25,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "1ce656d7-5f85-4d8d-99ea-f788f42201d2",
    "question": "Was ergibt der Ausdruck: ¬F ∧ ¬B bei B=1, F=0, K=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 26,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "9dd2302d-8237-4c40-ac05-9cb54c0d49b7",
    "question": "Was ergibt der Ausdruck: ¬K ∨ ¬B bei B=1, F=0, K=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 27,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "e24c09ce-1c12-419d-a7bf-90b3c935b4f2",
    "question": "Was ergibt der Ausdruck: F ∨ ¬K bei B=1, F=0, K=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 28,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "815ca97a-3096-4c52-8151-08ac512d219a",
    "question": "Was ergibt der Ausdruck: F ∧ ¬F bei B=1, F=0, K=1?",
    "correctAnswer": "0",
    "options": "[\"0\",\"1\",\"1\",\"1\"]",
    "order": 29,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "33780d66-7a98-438f-8256-7b8639eaeba8",
    "question": "Was ergibt der Ausdruck: K ∨ ¬F bei B=1, F=0, K=1?",
    "correctAnswer": "1",
    "options": "[\"1\",\"0\",\"0\",\"0\"]",
    "order": 30,
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-07-30T22:16:40.873Z",
    "updatedAt": "2025-07-30T22:16:40.873Z"
  },
  {
    "id": "cc4a8322-4f40-4d13-9ce8-fce7924f8615",
    "question": "Was ist die Summe von 5 + 3?",
    "correctAnswer": "8",
    "options": "[\"8\",\"7\",\"9\",\"6\"]",
    "order": 1,
    "quizId": "957caf31-c945-46ad-bd68-0c6a922401b6",
    "createdAt": "2025-07-31T14:49:04.954Z",
    "updatedAt": "2025-07-31T14:49:04.954Z"
  },
  {
    "id": "3a556e9e-50d9-4d9a-9879-df425a6d0180",
    "question": "Welche Form hat ein Kreis?",
    "correctAnswer": "Rund",
    "options": "[\"Rund\",\"Eckig\",\"Dreieckig\",\"Quadratisch\"]",
    "order": 2,
    "quizId": "957caf31-c945-46ad-bd68-0c6a922401b6",
    "createdAt": "2025-07-31T14:49:04.954Z",
    "updatedAt": "2025-07-31T14:49:04.954Z"
  },
  {
    "id": "a9ff9079-7a9d-42ea-ab19-aad7dd37ce6d",
    "question": "Was ist die Hälfte von 20?",
    "correctAnswer": "10",
    "options": "[\"10\",\"15\",\"5\",\"25\"]",
    "order": 3,
    "quizId": "957caf31-c945-46ad-bd68-0c6a922401b6",
    "createdAt": "2025-07-31T14:49:04.954Z",
    "updatedAt": "2025-07-31T14:49:04.954Z"
  },
  {
    "id": "266b6d82-b79a-4cc8-bc29-d8af277db646",
    "question": "Welche Zahl kommt nach 9?",
    "correctAnswer": "10",
    "options": "[\"10\",\"8\",\"11\",\"7\"]",
    "order": 4,
    "quizId": "957caf31-c945-46ad-bd68-0c6a922401b6",
    "createdAt": "2025-07-31T14:49:04.954Z",
    "updatedAt": "2025-07-31T14:49:04.954Z"
  }
];
  for (const qq of quizQuestions) {
    await prisma.quizQuestion.create({ data: qq });
  }
  console.log(`Created ${quizQuestions.length} quiz questions`);

  // LessonMaterial
  const lessonMaterials = [
  {
    "id": "7aa539f2-b134-46c6-a779-c9b599abfd1d",
    "lessonId": "8a659fa7-4de0-4db7-8163-28ece619d862",
    "materialId": "aa3383f2-aea2-4d31-b4c5-26e9ff0fec91",
    "createdAt": "2025-07-30T10:07:32.031Z"
  },
  {
    "id": "b3d484a6-2bb6-4844-b2a8-f269c80e7a06",
    "lessonId": "8a659fa7-4de0-4db7-8163-28ece619d862",
    "materialId": "e5349bc2-a0a8-488a-a20c-2d21862415ae",
    "createdAt": "2025-07-30T10:08:25.383Z"
  },
  {
    "id": "031c51d7-29b8-424d-b6a3-9d37a99beb8e",
    "lessonId": "160d3b2e-98ae-46e8-ad0e-1140b3e8701d",
    "materialId": "cb416b17-928f-448d-b618-0bc25909f73a",
    "createdAt": "2025-07-30T10:14:44.222Z"
  },
  {
    "id": "893e257e-fae3-418b-b89f-3dd3053235d6",
    "lessonId": "681845d0-8811-45ad-8b0f-8f2f9386e06f",
    "materialId": "aa3383f2-aea2-4d31-b4c5-26e9ff0fec91",
    "createdAt": "2025-07-31T15:13:03.135Z"
  }
];
  for (const lm of lessonMaterials) {
    await prisma.lessonMaterial.create({ data: lm });
  }
  console.log(`Created ${lessonMaterials.length} lesson materials`);

  // LessonQuiz
  const lessonQuizzes = [
  {
    "id": "9840b63f-9710-4534-b00c-c4db78d72f42",
    "lessonId": "636fbfb7-ce64-4e88-93fb-3f61cea426d7",
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-07-31T15:03:37.448Z"
  },
  {
    "id": "74009258-cf23-4aed-81cc-eae1d0a5c49e",
    "lessonId": "4ec32f6f-d184-4251-943f-731414dcc9da",
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "createdAt": "2025-08-01T20:44:46.697Z"
  },
  {
    "id": "31951b3f-3456-4eba-82a3-9273852c64ee",
    "lessonId": "db705e42-21bb-47ce-b031-6c02886e410f",
    "quizId": "957caf31-c945-46ad-bd68-0c6a922401b6",
    "createdAt": "2025-08-01T21:47:33.961Z"
  },
  {
    "id": "7d88d753-26b2-4896-a3a7-309b3a84e20f",
    "lessonId": "947cbfc3-fd8f-4c8e-82af-0dadc4e60508",
    "quizId": "16281e50-e4b1-4dec-8151-e5fb4a85e2d7",
    "createdAt": "2025-08-02T21:30:55.617Z"
  }
];
  for (const lq of lessonQuizzes) {
    await prisma.lessonQuiz.create({ data: lq });
  }
  console.log(`Created ${lessonQuizzes.length} lesson quizzes`);

  // QuizSession
  const quizSessions = [
  {
    "id": "11daca23-a658-4a44-aa9c-8a124c29f952",
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "isActive": false,
    "startedAt": "2025-08-01T21:48:20.303Z",
    "endedAt": "2025-08-01T21:49:39.672Z",
    "createdAt": "2025-08-01T21:48:20.305Z",
    "updatedAt": "2025-08-01T21:49:39.673Z"
  },
  {
    "id": "e27ab47a-5bac-48d7-8d3b-0b1b7dffa7f9",
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "isActive": false,
    "startedAt": "2025-08-01T21:50:09.047Z",
    "endedAt": "2025-08-01T21:52:54.984Z",
    "createdAt": "2025-08-01T21:50:09.048Z",
    "updatedAt": "2025-08-01T21:52:54.985Z"
  },
  {
    "id": "1b34113b-6cf5-4dfe-ac8f-358981598a61",
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "isActive": false,
    "startedAt": "2025-08-01T21:53:00.924Z",
    "endedAt": "2025-08-01T21:54:38.464Z",
    "createdAt": "2025-08-01T21:53:00.925Z",
    "updatedAt": "2025-08-01T21:54:38.465Z"
  },
  {
    "id": "cd5fa472-ccae-485e-944c-d4c0f84e8011",
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "isActive": false,
    "startedAt": "2025-08-01T21:54:41.142Z",
    "endedAt": "2025-08-01T21:55:04.686Z",
    "createdAt": "2025-08-01T21:54:41.143Z",
    "updatedAt": "2025-08-01T21:55:04.686Z"
  },
  {
    "id": "95dd69dc-03d4-4f9e-acda-5fae66392205",
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "isActive": false,
    "startedAt": "2025-08-01T21:55:04.906Z",
    "endedAt": "2025-08-01T21:55:05.659Z",
    "createdAt": "2025-08-01T21:55:04.907Z",
    "updatedAt": "2025-08-01T21:55:05.660Z"
  },
  {
    "id": "b825d2b0-93c7-456c-aeb2-3b28e22d86c9",
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "isActive": false,
    "startedAt": "2025-08-01T21:55:09.934Z",
    "endedAt": "2025-08-01T21:57:11.418Z",
    "createdAt": "2025-08-01T21:55:09.934Z",
    "updatedAt": "2025-08-01T21:57:11.420Z"
  },
  {
    "id": "e3adc77e-4ee8-4c57-9a72-71ff75ff6321",
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "isActive": false,
    "startedAt": "2025-08-01T21:57:15.264Z",
    "endedAt": "2025-08-01T21:57:24.410Z",
    "createdAt": "2025-08-01T21:57:15.265Z",
    "updatedAt": "2025-08-01T21:57:24.411Z"
  },
  {
    "id": "7c324feb-708f-461f-aaad-6d05a212317e",
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "isActive": false,
    "startedAt": "2025-08-01T21:57:30.367Z",
    "endedAt": "2025-08-02T07:07:29.666Z",
    "createdAt": "2025-08-01T21:57:30.367Z",
    "updatedAt": "2025-08-02T07:07:29.667Z"
  },
  {
    "id": "f9004116-d878-426c-8b26-0d9635fd6c0b",
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "isActive": false,
    "startedAt": "2025-08-02T07:11:21.823Z",
    "endedAt": "2025-08-02T07:14:34.598Z",
    "createdAt": "2025-08-02T07:11:21.825Z",
    "updatedAt": "2025-08-02T07:14:34.599Z"
  },
  {
    "id": "e18a9156-2be6-4a24-a4d6-919f85b33d28",
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "isActive": false,
    "startedAt": "2025-08-02T07:14:35.620Z",
    "endedAt": "2025-08-02T07:14:36.750Z",
    "createdAt": "2025-08-02T07:14:35.621Z",
    "updatedAt": "2025-08-02T07:14:36.751Z"
  },
  {
    "id": "ebfd0c04-5bff-4551-b0ba-da077ace01e4",
    "quizId": "957caf31-c945-46ad-bd68-0c6a922401b6",
    "isActive": false,
    "startedAt": "2025-08-02T07:14:48.632Z",
    "endedAt": "2025-08-02T07:16:05.231Z",
    "createdAt": "2025-08-02T07:14:48.633Z",
    "updatedAt": "2025-08-02T07:16:05.232Z"
  },
  {
    "id": "1d62a3b8-fe9c-453c-9b17-49950ceffc1e",
    "quizId": "957caf31-c945-46ad-bd68-0c6a922401b6",
    "isActive": false,
    "startedAt": "2025-08-02T07:18:38.687Z",
    "endedAt": "2025-08-02T07:19:25.535Z",
    "createdAt": "2025-08-02T07:18:38.688Z",
    "updatedAt": "2025-08-02T07:19:25.536Z"
  },
  {
    "id": "f2ea9d48-45a5-45d8-a924-03fff47991b1",
    "quizId": "957caf31-c945-46ad-bd68-0c6a922401b6",
    "isActive": false,
    "startedAt": "2025-08-02T07:21:14.604Z",
    "endedAt": "2025-08-02T07:22:21.715Z",
    "createdAt": "2025-08-02T07:21:14.605Z",
    "updatedAt": "2025-08-02T07:22:21.716Z"
  },
  {
    "id": "c867148a-b632-4297-ab1a-778ebec1b091",
    "quizId": "957caf31-c945-46ad-bd68-0c6a922401b6",
    "isActive": false,
    "startedAt": "2025-08-02T07:32:30.355Z",
    "endedAt": "2025-08-02T19:04:44.525Z",
    "createdAt": "2025-08-02T07:32:30.356Z",
    "updatedAt": "2025-08-02T19:04:44.526Z"
  },
  {
    "id": "2a0e1770-8f23-4670-b19a-79ffb3c8fa64",
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "isActive": false,
    "startedAt": "2025-08-02T19:03:17.880Z",
    "endedAt": "2025-08-02T19:52:52.401Z",
    "createdAt": "2025-08-02T19:03:17.881Z",
    "updatedAt": "2025-08-02T19:52:52.406Z"
  },
  {
    "id": "5275b33b-6872-424b-afe2-dafc8b2db125",
    "quizId": "957caf31-c945-46ad-bd68-0c6a922401b6",
    "isActive": false,
    "startedAt": "2025-08-02T19:04:50.571Z",
    "endedAt": "2025-08-02T19:07:13.838Z",
    "createdAt": "2025-08-02T19:04:50.573Z",
    "updatedAt": "2025-08-02T19:07:13.839Z"
  },
  {
    "id": "18786e39-8b61-4c73-b573-b890ea8ed89a",
    "quizId": "957caf31-c945-46ad-bd68-0c6a922401b6",
    "isActive": false,
    "startedAt": "2025-08-02T19:07:14.709Z",
    "endedAt": "2025-08-02T19:07:50.636Z",
    "createdAt": "2025-08-02T19:07:14.710Z",
    "updatedAt": "2025-08-02T19:07:50.637Z"
  },
  {
    "id": "afe86774-2d0f-4a4e-8b74-c9ad7f036612",
    "quizId": "957caf31-c945-46ad-bd68-0c6a922401b6",
    "isActive": true,
    "startedAt": "2025-08-02T20:06:02.129Z",
    "endedAt": null,
    "createdAt": "2025-08-02T20:06:02.131Z",
    "updatedAt": "2025-08-02T20:06:02.131Z"
  },
  {
    "id": "ba131df3-af49-41c3-941a-9ce9c26017ac",
    "quizId": "fbfff975-4ccd-43bc-9dda-d3fb39b497de",
    "isActive": true,
    "startedAt": "2025-08-02T21:25:35.361Z",
    "endedAt": null,
    "createdAt": "2025-08-02T21:25:35.362Z",
    "updatedAt": "2025-08-02T21:25:35.362Z"
  }
];
  for (const qs of quizSessions) {
    await prisma.quizSession.create({ data: qs });
  }
  console.log(`Created ${quizSessions.length} quiz sessions`);

  // QuizParticipation
  const quizParticipations = [
  {
    "id": "1295ec8c-8bf9-42bb-97d9-72c284f90147",
    "sessionId": "afe86774-2d0f-4a4e-8b74-c9ad7f036612",
    "studentId": "359611d5-7441-4015-8572-38dc77b557a1",
    "startedAt": "2025-08-02T20:09:19.141Z",
    "completedAt": "2025-08-02T20:09:21.064Z",
    "score": 1,
    "maxScore": 4,
    "createdAt": "2025-08-02T20:09:19.142Z",
    "updatedAt": "2025-08-02T20:09:21.066Z"
  },
  {
    "id": "21255b4c-14f1-4614-9c0b-34d96f6a98fa",
    "sessionId": "ba131df3-af49-41c3-941a-9ce9c26017ac",
    "studentId": "4b09f68d-a1cd-4a5a-9cf8-e30d2732942e",
    "startedAt": "2025-08-03T21:16:15.275Z",
    "completedAt": null,
    "score": null,
    "maxScore": 30,
    "createdAt": "2025-08-02T21:25:35.376Z",
    "updatedAt": "2025-08-03T21:16:15.277Z"
  },
  {
    "id": "8e1be37f-85c6-4f6b-bdb4-f361e0cb79dc",
    "sessionId": "afe86774-2d0f-4a4e-8b74-c9ad7f036612",
    "studentId": "331c4df7-26ec-4ea2-b756-81a408317d9b",
    "startedAt": "2025-08-02T21:36:37.691Z",
    "completedAt": "2025-08-02T21:36:48.381Z",
    "score": 0,
    "maxScore": 4,
    "createdAt": "2025-08-02T21:36:37.692Z",
    "updatedAt": "2025-08-02T21:36:48.384Z"
  },
  {
    "id": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "sessionId": "ba131df3-af49-41c3-941a-9ce9c26017ac",
    "studentId": "331c4df7-26ec-4ea2-b756-81a408317d9b",
    "startedAt": "2025-08-03T21:16:48.752Z",
    "completedAt": "2025-08-03T21:16:54.715Z",
    "score": 14,
    "maxScore": 30,
    "createdAt": "2025-08-03T21:15:31.452Z",
    "updatedAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "5c17fc8f-839b-4628-ae0c-cf16fa4f04cf",
    "sessionId": "ba131df3-af49-41c3-941a-9ce9c26017ac",
    "studentId": "530fee57-6c45-42af-abd7-c51a742fde41",
    "startedAt": "2025-08-03T21:30:52.003Z",
    "completedAt": null,
    "score": null,
    "maxScore": 30,
    "createdAt": "2025-08-03T21:30:52.005Z",
    "updatedAt": "2025-08-03T21:30:52.005Z"
  }
];
  for (const qp of quizParticipations) {
    await prisma.quizParticipation.create({ data: qp });
  }
  console.log(`Created ${quizParticipations.length} quiz participations`);

  // QuizAnswer
  const quizAnswers = [
  {
    "id": "7f276f06-5c56-48ab-9cba-46e44fcdacbe",
    "participationId": "1295ec8c-8bf9-42bb-97d9-72c284f90147",
    "questionId": "266b6d82-b79a-4cc8-bc29-d8af277db646",
    "selectedAnswer": "8",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-02T20:09:21.066Z"
  },
  {
    "id": "636fa4ea-0396-4313-aa29-98ba7041c9a3",
    "participationId": "1295ec8c-8bf9-42bb-97d9-72c284f90147",
    "questionId": "a9ff9079-7a9d-42ea-ab19-aad7dd37ce6d",
    "selectedAnswer": "25",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-02T20:09:21.066Z"
  },
  {
    "id": "d49d7ebf-c07a-4842-87f6-e2aa8b39728e",
    "participationId": "1295ec8c-8bf9-42bb-97d9-72c284f90147",
    "questionId": "3a556e9e-50d9-4d9a-9879-df425a6d0180",
    "selectedAnswer": "Rund",
    "isCorrect": true,
    "points": 1,
    "answeredAt": "2025-08-02T20:09:21.066Z"
  },
  {
    "id": "f36c215e-7382-4468-b4c7-dfb298427502",
    "participationId": "1295ec8c-8bf9-42bb-97d9-72c284f90147",
    "questionId": "cc4a8322-4f40-4d13-9ce8-fce7924f8615",
    "selectedAnswer": "6",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-02T20:09:21.066Z"
  },
  {
    "id": "71c89cb5-4d90-4622-8549-fafec9f53f38",
    "participationId": "8e1be37f-85c6-4f6b-bdb4-f361e0cb79dc",
    "questionId": "cc4a8322-4f40-4d13-9ce8-fce7924f8615",
    "selectedAnswer": "7",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-02T21:36:48.384Z"
  },
  {
    "id": "9379fffb-3e13-4b10-84f9-38b93ef9ff8f",
    "participationId": "8e1be37f-85c6-4f6b-bdb4-f361e0cb79dc",
    "questionId": "3a556e9e-50d9-4d9a-9879-df425a6d0180",
    "selectedAnswer": "Quadratisch",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-02T21:36:48.384Z"
  },
  {
    "id": "79c72464-d287-47e6-8cf6-7f0e3cfce5fb",
    "participationId": "8e1be37f-85c6-4f6b-bdb4-f361e0cb79dc",
    "questionId": "266b6d82-b79a-4cc8-bc29-d8af277db646",
    "selectedAnswer": "8",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-02T21:36:48.384Z"
  },
  {
    "id": "bd9dde4f-a4c4-46f0-a997-ce0da8f7fa36",
    "participationId": "8e1be37f-85c6-4f6b-bdb4-f361e0cb79dc",
    "questionId": "a9ff9079-7a9d-42ea-ab19-aad7dd37ce6d",
    "selectedAnswer": "25",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-02T21:36:48.384Z"
  },
  {
    "id": "0363e695-8ace-47d4-98a8-e8c7db556dc2",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "6de63963-865c-4881-a206-e9311fa38376",
    "selectedAnswer": "¬G ∨ S",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "0828c84c-cb66-4642-934b-a6798b0578b9",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "21c689c8-9902-403b-a5d0-4cd1697a6d09",
    "selectedAnswer": "1 ∧ 1",
    "isCorrect": true,
    "points": 1,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "bdf2c78b-9bc4-4a8f-9a55-06c1295ef8a5",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "e40a1afc-5542-4fd7-bb7c-675b6260d08c",
    "selectedAnswer": "0",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "af347beb-e7d4-4481-ad0d-ed4f415600e2",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "aac0de66-eff9-4a72-a001-7513f3803d89",
    "selectedAnswer": "¬K ∧ ¬R",
    "isCorrect": true,
    "points": 1,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "699dc42c-c20a-4a75-8d18-fd62c11663ef",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "dae3291b-dfe2-43cf-bec6-4bd11fa9b3fc",
    "selectedAnswer": "0",
    "isCorrect": true,
    "points": 1,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "1db0a158-bde4-4caa-870e-3311fb59eaaa",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "34812ba5-6dab-4286-9930-15434fa5ce45",
    "selectedAnswer": "1",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "f9ec9830-27b5-4e6d-96b3-c4a49401c53c",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "7cac2a64-e83a-4aef-a656-f6108acf8940",
    "selectedAnswer": "0",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "233a644d-4a73-488e-be32-149185619c87",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "d4274c9f-c075-44bf-83d0-2870655e0410",
    "selectedAnswer": "1",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "bdcc771c-387f-45c3-ae66-ba25723a3cd4",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "4f8e5da1-a38b-4b8f-8e89-b677de5a6649",
    "selectedAnswer": "1",
    "isCorrect": true,
    "points": 1,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "d5d0b623-e76c-462f-8ce0-f8f4a9323974",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "33704cbe-1e7b-4d3c-85b7-052a32ab6a1b",
    "selectedAnswer": "0",
    "isCorrect": true,
    "points": 1,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "e511593e-33c3-4a03-a175-22297365f7fa",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "c399de1b-9167-4291-bac9-c0e560bd8bf3",
    "selectedAnswer": "0",
    "isCorrect": true,
    "points": 1,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "a5017ec4-a315-41e7-bd91-51be5d4a238d",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "29f8f5cc-4c9e-4f62-bc7a-bb9392518b4c",
    "selectedAnswer": "A ",
    "isCorrect": false,
    "points": null,
    "answeredAt": "1970-01-01T00:00:00.000Z"
  },
  {
    "id": "67c009d1-903c-45e8-80da-c2cc648d2e37",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "0035c040-f768-4a8c-8836-e45b4af88332",
    "selectedAnswer": "A ∧ B",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "24cbf62c-8e0f-4690-950c-44f833896865",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "8184aedd-13b8-46b4-9d2d-5653f5f44347",
    "selectedAnswer": "1",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "0ddcbb90-6c96-4715-a05a-a0eeb86a99c8",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "4f5d3626-d4d9-49e4-9caa-d2dac03c786b",
    "selectedAnswer": "1",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "6af0e5ec-7e65-4251-ba3a-3a08ad8650fa",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "b45a6f28-32d0-42cb-977e-0f71bb0595a7",
    "selectedAnswer": "1",
    "isCorrect": true,
    "points": 1,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "4c3c08d8-edde-4cd8-93fb-66a17ba887b2",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "d76d8bc5-62a1-4f7d-8d46-00d2fdc1e5ab",
    "selectedAnswer": "0",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "90dbf085-c3e5-4b19-961e-efb43423aa33",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "877a9f4f-ad9e-445a-833c-552268b290de",
    "selectedAnswer": "(H ∨ B) ∧ ¬S",
    "isCorrect": true,
    "points": 1,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "5f0b9dc9-be2b-4177-8b45-7f5b37924608",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "276535ed-6bfd-4f7d-9474-8c336872b9de",
    "selectedAnswer": "A ∧ ¬B",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "58697d38-5b16-4ec9-a98d-9b1753b88182",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "4c322b35-4fa2-45f2-87d7-7065fc492034",
    "selectedAnswer": "1",
    "isCorrect": true,
    "points": 1,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "7c5045e7-0ff4-4350-b1fb-1ac68137454c",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "38cce6ef-d309-40fb-a38b-fb2f09cb9f2b",
    "selectedAnswer": "1",
    "isCorrect": true,
    "points": 1,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "a9c6369d-9ec6-43b5-8ed0-9e9488930332",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "e5098efe-2105-4e5c-8fd6-7678b0536adf",
    "selectedAnswer": "1",
    "isCorrect": true,
    "points": 1,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "f3373294-1c39-4cdb-bf85-93f00b875cd2",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "acae86e2-a82b-466d-aa30-5dd09a17aa10",
    "selectedAnswer": "0",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "bdfe1f37-bc72-4ee5-9ffa-96bc58e373c8",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "1cec458a-19b4-421a-ade6-1d15acccbab9",
    "selectedAnswer": "1",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "d2d5ecc1-3df9-48ed-b607-9dd1d09629b5",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "047ebd2d-5518-4d35-94d2-755e61831af0",
    "selectedAnswer": "0",
    "isCorrect": true,
    "points": 1,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "41091f1f-73c5-4c3f-b212-782ce6e0a063",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "7098bec8-1daa-4d92-93d3-992ad464f328",
    "selectedAnswer": "1",
    "isCorrect": true,
    "points": 1,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "41878c58-6eff-4955-a1df-e51a910e67c8",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "cfc00490-294c-4460-b8c0-5d1738bc9915",
    "selectedAnswer": "1",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "39d48c01-07ea-4faf-9179-c93ad7d1d5e0",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "efcf85bd-dc4e-4364-97c7-f67e42ff1ca0",
    "selectedAnswer": "1",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "c028c9f5-f782-419a-858b-2a5224d25235",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "986de06c-adca-4bdd-85b1-6cce771645c8",
    "selectedAnswer": "0",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  },
  {
    "id": "a0abc21f-8f24-41f0-afdd-ddbf22b0b728",
    "participationId": "8af1aaec-f20c-4530-8816-7b8efd4a67b2",
    "questionId": "a3e151ef-32fd-471e-be7a-477d73ef6c30",
    "selectedAnswer": "1",
    "isCorrect": false,
    "points": 0,
    "answeredAt": "2025-08-03T21:16:54.717Z"
  }
];
  for (const qa of quizAnswers) {
    await prisma.quizAnswer.create({ data: qa });
  }
  console.log(`Created ${quizAnswers.length} quiz answers`);

  // GroupAssignment
  const groupAssignments = [
  {
    "id": "d6de3912-0bab-4afe-812e-041d9d5d8676",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "subject",
    "refId": "63d3a6d0-a7d1-496b-beb4-ea222a0831ed",
    "createdAt": "2025-07-29T20:50:36.157Z"
  },
  {
    "id": "093fbc5a-7575-4b00-a8df-debc2dd823a3",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "block",
    "refId": "7e6883c6-1ded-489d-9c34-3e5e5c0ef20d",
    "createdAt": "2025-07-29T21:00:13.112Z"
  },
  {
    "id": "106d2ec7-d428-403a-8448-2d27f7acefc5",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "unit",
    "refId": "af62b3a9-48fa-4874-8fcb-5aeed31ed154",
    "createdAt": "2025-07-29T21:00:14.534Z"
  },
  {
    "id": "900ae02a-a781-428b-8008-7b846123a2c0",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "topic",
    "refId": "35c8a998-8bd6-4885-8d61-f9856e0caf8f",
    "createdAt": "2025-07-29T21:00:15.949Z"
  },
  {
    "id": "1b3b8cf0-a148-42eb-9bc6-f03601f40afc",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "lesson",
    "refId": "db705e42-21bb-47ce-b031-6c02886e410f",
    "createdAt": "2025-07-29T21:00:39.755Z"
  },
  {
    "id": "f2727f4b-41d0-4999-8f70-88199c284afb",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "lesson",
    "refId": "f21a8e7e-233f-4461-8baf-0fa13529b64a",
    "createdAt": "2025-07-30T09:40:16.838Z"
  },
  {
    "id": "d84d56f6-0111-4135-b0a6-83f335d132b8",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "unit",
    "refId": "3883ccf7-35ec-4abe-9009-75168ace4b8e",
    "createdAt": "2025-07-30T09:47:41.332Z"
  },
  {
    "id": "0c39a661-b977-4802-9fc5-005ee5a3a43b",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "topic",
    "refId": "ca7f602b-b735-446b-adca-da725cbd03ba",
    "createdAt": "2025-07-30T09:49:13.187Z"
  },
  {
    "id": "df2e42ba-bd30-44d1-a456-e3e65c424675",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "topic",
    "refId": "216c4085-36e6-41b7-9665-ad3c81af1b8c",
    "createdAt": "2025-07-30T09:49:14.615Z"
  },
  {
    "id": "d05754d7-8d5c-4b68-a41d-864bd0e9113b",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "topic",
    "refId": "15e87553-ffe1-4d45-9a71-1e078677f168",
    "createdAt": "2025-07-30T09:49:15.914Z"
  },
  {
    "id": "6323363f-3f5e-46c5-b4ba-d8b249f65d9e",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "topic",
    "refId": "19be3a1a-6b75-4a16-bf98-305d029e04a7",
    "createdAt": "2025-07-30T09:49:18.976Z"
  },
  {
    "id": "90f40613-fd3c-4105-9936-99714d43338b",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "topic",
    "refId": "867fa1e6-1baf-4132-83e2-a3c0b90251cf",
    "createdAt": "2025-07-30T09:49:43.270Z"
  },
  {
    "id": "3b317779-f728-4574-9f5a-7b2e317ec08b",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "topic",
    "refId": "7ae8592c-5973-44d7-a51d-efe524237546",
    "createdAt": "2025-07-30T09:49:56.597Z"
  },
  {
    "id": "6a4caa58-e61d-4c52-96d1-8d21dca6a0d4",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "lesson",
    "refId": "947cbfc3-fd8f-4c8e-82af-0dadc4e60508",
    "createdAt": "2025-07-30T09:51:40.256Z"
  },
  {
    "id": "7256b40f-ed57-47fa-b806-0cd36fa50d33",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "lesson",
    "refId": "681845d0-8811-45ad-8b0f-8f2f9386e06f",
    "createdAt": "2025-07-30T09:51:41.774Z"
  },
  {
    "id": "cd0ea0c3-7b74-4ec2-b607-2e5563d1e7af",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "block",
    "refId": "cc755c84-0be3-4ece-99c8-9a3bf2ce219e",
    "createdAt": "2025-07-30T09:52:52.256Z"
  },
  {
    "id": "c92964a9-c904-48de-91f1-7fe1fd6c3e2d",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "block",
    "refId": "225dc96d-8ff1-4539-9461-bc0242dda06a",
    "createdAt": "2025-07-30T09:52:53.849Z"
  },
  {
    "id": "7af11a30-d73c-40f4-b696-d14c69320cb4",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "unit",
    "refId": "5998d206-044c-4ab1-bd74-59b54ca64f16",
    "createdAt": "2025-07-30T09:53:25.511Z"
  },
  {
    "id": "b9317ebc-be75-423f-a76e-b2fc0f6f3e47",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "topic",
    "refId": "19ccb2bf-e4f1-441c-81cd-df776b6d994d",
    "createdAt": "2025-07-30T09:54:18.256Z"
  },
  {
    "id": "0c3acc55-399a-4729-a63a-ff59bbef1b00",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "lesson",
    "refId": "4ec32f6f-d184-4251-943f-731414dcc9da",
    "createdAt": "2025-07-30T09:54:48.373Z"
  },
  {
    "id": "9de10af1-e96e-4e1e-b108-2dbf98659568",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "lesson",
    "refId": "ca179b61-0c10-433f-8493-6024a9d5e87b",
    "createdAt": "2025-07-30T09:55:17.725Z"
  },
  {
    "id": "2b6b5586-05ac-434a-a807-36e2d64094c6",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "lesson",
    "refId": "537f5fa6-c8b7-4024-a6d4-e1c3de55f673",
    "createdAt": "2025-07-30T09:55:24.665Z"
  },
  {
    "id": "bd54f72f-bc09-43c3-b95e-39b63244273c",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "unit",
    "refId": "6ec37a12-e944-4019-b95d-692a3d9d08f1",
    "createdAt": "2025-07-30T09:55:39.822Z"
  },
  {
    "id": "60923667-689c-4c99-94fb-5ee4aa8e9853",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "topic",
    "refId": "fc59e18a-c014-49e5-99ca-f2684c4478db",
    "createdAt": "2025-07-30T09:55:51.583Z"
  },
  {
    "id": "bba2c56b-f8bb-4a2c-958e-5065dbeed5ca",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "lesson",
    "refId": "8a659fa7-4de0-4db7-8163-28ece619d862",
    "createdAt": "2025-07-30T09:56:28.063Z"
  },
  {
    "id": "9da80a95-a9a0-47de-bac8-debeff9c97e3",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "lesson",
    "refId": "6f342d97-18c3-438a-90ce-3b36501393a2",
    "createdAt": "2025-07-30T09:56:47.913Z"
  },
  {
    "id": "7f937d4d-9091-4102-8d84-dee620d872d2",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "lesson",
    "refId": "a9a3caed-7d30-4862-a3b7-f9e3cf888ebe",
    "createdAt": "2025-07-30T09:57:58.613Z"
  },
  {
    "id": "fe538ae2-2299-4891-bd1d-fcae65f10bd6",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "topic",
    "refId": "fa9fecd0-174c-47f1-85d8-9d2e57fe7417",
    "createdAt": "2025-07-30T09:58:00.246Z"
  },
  {
    "id": "372e02c2-68e1-4446-9e97-d3128371152c",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "lesson",
    "refId": "a31f47a8-f822-4dcd-a983-27eb7de46987",
    "createdAt": "2025-07-30T09:58:01.701Z"
  },
  {
    "id": "e85d392e-69f8-46e5-b73e-3374af9d979a",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "lesson",
    "refId": "26c474da-1bda-45e7-88a7-b78490b163c5",
    "createdAt": "2025-07-30T09:58:03.278Z"
  },
  {
    "id": "f2e6346c-f13e-4be6-9982-3365efa718dc",
    "groupId": "c69586ac-0229-4cea-9c22-4a43ebca2509",
    "type": "lesson",
    "refId": "160d3b2e-98ae-46e8-ad0e-1140b3e8701d",
    "createdAt": "2025-07-30T10:14:10.311Z"
  },
  {
    "id": "2ee25183-3b00-492c-8d9b-d46408b80d1f",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "lesson",
    "refId": "636fbfb7-ce64-4e88-93fb-3f61cea426d7",
    "createdAt": "2025-07-30T10:15:59.335Z"
  },
  {
    "id": "b61daee0-2011-47c4-abe6-10d4223bec96",
    "groupId": "8000d012-758d-4191-b47c-cc8816e88eba",
    "type": "subject",
    "refId": "59693f42-a733-442c-b745-5a1148da8d7c",
    "createdAt": "2025-08-03T20:48:47.355Z"
  }
];
  for (const ga of groupAssignments) {
    await prisma.groupAssignment.create({ data: ga });
  }
  console.log(`Created ${groupAssignments.length} group assignments`);

  // GradingSchema
  const gradingSchemas = [
  {
    "id": "70b5240e-3396-465c-8edc-362b9260e7b6",
    "name": "Mittelstufe",
    "structure": "Mittelstufe (100%)",
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "  Mittelstufe (100%)",
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "    Klassenarbeiten (50%)",
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "      Erste Klassenarbeit (50%)",
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "      Zweite Klassenarbeit (50%)",
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "    Sonstige Leistungen (50%)",
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "      Mündliche Noten (33.3%)",
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "        EPO 1 (50%)",
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "        EPO 2 (50%)",
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "      Quizze/Hüs (33.3%)",
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "        WDH (10%)",
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "        Rest (90%)",
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "      Projekte, Mappen, Referate (33.4%)",
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "        Aufgabenfuchs (10%)",
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "        Rest (90%)",
    "name": "8000d012-758d-4191-b47c-cc8816e88eba",
    "structure": "1754342826577",
    "groupId": "1754345512852",
    "createdAt": null,
    "updatedAt": null
  },
  {
    "id": "e7c24bbc-f7c1-4a38-a691-8c34319cf8bb",
    "name": "Mathematik Bewertung 2024",
    "structure": "Mathematik Bewertung 2024 (100%)\\n  Mündliche Leistungen (50%)\\n    EPO1 (25%)\\n    EPO2 (25%)\\n  Schriftliche Leistungen (50%)\\n    Klassenarbeit 1 (25%)\\n    Klassenarbeit 2 (25%)",
    "groupId": "9b7cee71-c63a-4801-b9a8-4a1e754b2211",
    "createdAt": "2025-08-04T21:44:10.143Z",
    "updatedAt": "2025-08-04T21:44:10.143Z"
  },
  {
    "id": "e357b8c6-52b4-4d1e-9888-a449c7982dd3",
    "name": "Informatik Bewertung GK11",
    "structure": "Informatik Bewertung GK11 (100%)\\n  Theorie (40%)\\n    Tests (20%)\\n    Hausaufgaben (20%)\\n  Praxis (60%)\\n    Projekte (30%)\\n    Präsentationen (30%)",
    "groupId": "07d9ab36-52d8-4a33-808c-6e3dddeffe7b",
    "createdAt": "2025-08-04T21:44:10.144Z",
    "updatedAt": "2025-08-04T21:44:10.144Z"
  }
];
  for (const gs of gradingSchemas) {
    await prisma.gradingSchema.create({ data: gs });
  }
  console.log(`Created ${gradingSchemas.length} grading schemas`);

  console.log('Database seeded successfully!');
}

main()
  .then(() => {
    console.log('Seeding completed');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
