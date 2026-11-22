# 0001. Konfiguracja konta AWS

- Status: Accepted
- Data: 2026-11-22

## Kontekst
W ramach nauki wrzucamy ten projekt na AWS. Obecnie śmiga na vercelu, za darmo, nie przekraczamy limitów bo to projekt hobbystyczny, bez realnych użytkowników na produkcji, bez przypisanej domeny.
Budżet ma być jak najniższy, żeby nie wydawać kasy na infra, które i tak nie będzie praktycznie używane.

Używam aws login zamiast access keys, bo wykorzystuje krótko trwające sesje, które wymagają zalogowania się do konta zabezpieczonego 2FA. Z access keys, ich wykradnięcie pozwoliłoby na nieograniczony czasowo dostęp, dopóki nie zostałyby revoked. Z aws login jest bezpieczniej. Wykorzystuje STS do generowania krótko żyjących trójek AccessKeyId, SecretAccessKey oraz SessionToken do podpisywania requestów.

## Decyzja
- tryb "projects" otrzymany by default przez zalogowanie się kontem Google. Konto ma więc tryb Builder ID
- brak konta root i brak trwałych kluczy
- tryb pokrywa wszystkie usługi z planowanej architektury (Lambda, API GW, DynamoDB, S3, SQS, CloudFront),
- aktywacja jest nieodwracalna, więc odkładamy ją do momentu, w którym będzie realnie potrzebna.
- region: eu-north-1, taki dostaliśmy by default i jest dla nas ok, bo jest blisko i nie wpływa na nasz budżet negatywnie. Wyjątek: ACM/CloudFront, us-east-1, ale to gdy będziemy przechodzić na własną domenę, bo teraz ACM nie jest potrzebny, bo lecimy na wewnętrzynm certyfikacie z AWS.
- dostęp z CLI przez `aws login`, zero access keys, tymczasowe poświadczenia są bezpieczniejsze

## Rozważane alternatywy
- włączenie advanced features i zarządzanie kontami poprzez AWS organizations. Nie potrzebujemy oraz nie pozwalałyby na utworzenie strict budget, który chroni nas lepiej niż alerty. Wszystkie usługi mam dostępne w "projects"
- konto root i access keys, ale ryzykowne (kradzież kluczy lub niechcący commit do repo)


## Konsekwencje
- twardy limit budżetu,
- brak roota - brak trwałych kluczy
- konsola przypisuje Lambdom `PowerUserRole`, więc wszystko tworzymy przez IaC z własnymi rolami
- yahoo API jest dostępne z Lambda function. Na razie póki Lambda nie wymaga połączenia z innymi serwisami w naszej prywatnej sieci nie musimy konfigurować NAT Gateway dla tego serwisu.

## Przy skali
Włączyłbym advanced features, żeby móc tworzyć osobne konta dev/prod (np. jedna osoba ma dostęp do wielu kont, aby działać na dev/prod, SSO. Service Control Policy na ograniczanie uprawnień dla kont (SCP nie daje uprawnień tylko nakłada ograniczenia).
Na egzamin: „SCP nie nadaje uprawnień, tylko je ogranicza”, a efektywne uprawnienia to część wspólna IAM i SCP. Takie pytania pojawiają się na egzaminie regularnie.