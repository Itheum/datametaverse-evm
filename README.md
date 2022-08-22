# Identiy and Claims PoC for EVM
POC for assessing feasibility of ERC725 and ERC735 to power our EVM identity portal

##Unit Tests
We tested the behaviour specified below.

###General
✅ deploy all contracts --> success

###NFMe
✅ mint with everything fulfilled --> success\
✅ mint with < 0.1 ether --> failure\
✅ mint when sold out --> failure\
✅ mint without claim --> failure\
✅ mint where claimSigner is wrong --> failure\
✅ mint where receiver is wrong --> failure\
✅ mint when claim is not yet valid --> failure\
✅ mint when claim is not valid anymore -> failure\
✅ mint when signature is altered but data in general is not --> failure\
✅ mint when singature is not altered but identifier --> failure\
✅ mint when singature is not altered but data field is altered --> failure\
✅ mint when signature is not altered but validFrom is altered --> failure\
✅ mint when signature is not altered but validTo is altered --> failure

###Identity Factory
✅ deployed contract should be owned by issuer --> success

###Identity
✅ additional owner call onlyOwner function --> success\
✅ not additional owner call onlyOwner function --> failure\
✅ (additional) owner add claim and it is stored --> success\
✅ (additional) owner overwrites claim and it is stored --> success\
✅ (additional) owner remove claim and it is removed --> success\
✅ (additional) owner add claim and event gets fired --> success\
✅ (additional) owner remove claim and event gets fired --> success\
✅ (additional) owner add additional owner when < 9 --> success\
✅ (additional) owner add additional owener when >= 9 --> failure\
✅ (additional) owner proposes additional removal --> success\
✅ (additional) owner proposes additional removal twice --> failure\
✅ (additional) owner removes additional owner (proposed owner has enough confirmations) --> success\
✅ (additional) owner removes additional owner (proposed owner has not enough confirmations) --> failure\
✅ (additional) owner removes additional owner (proposed owner is no additional owner) --> failure\