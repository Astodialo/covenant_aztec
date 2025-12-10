use dep::aztec::macros::aztec;
mod types;

#[aztec]
contract Governance {
    use crate::types::proposal_note::ProposalNote;
    use aztec::keys::getters::get_public_keys;
    use aztec::{
        macros::{functions::{external, initializer}, storage::storage},
        protocol_types::{address::AztecAddress, hash::poseidon2_hash, traits::{Hash, ToField}},
        state_vars::{
            map::Map, private_set::PrivateSet, public_immutable::PublicImmutable,
            public_mutable::PublicMutable,
        },
    };
    use compressed_string::FieldCompressedString;

    #[storage]
    struct Storage<Context> {
        symbol: PublicImmutable<FieldCompressedString, Context>,
        name: PublicImmutable<FieldCompressedString, Context>,
        minters: Map<Field, PublicMutable<bool, Context>, Context>,
        proposals: Map<AztecAddress, PrivateSet<ProposalNote, Context>, Context>,
    }

    #[external("public")]
    #[initializer]
    fn constructor(admin: AztecAddress, name: str<31>, symbol: str<31>) {
        assert(!admin.is_zero(), "invalid admin");
        let admin_hash = poseidon2_hash([admin.inner]);
        storage.symbol.initialize(FieldCompressedString::from_string(symbol));
        storage.symbol.initialize(FieldCompressedString::from_string(name));
        storage.minters.at(admin_hash).write(true);
    }

    #[external("private")]
    fn cast_vote(proposal_id: Field, candidate: Field) {
        let msg_sender_npk_hash = get_public_keys(context.msg_sender().unwrap()).npk_m.hash();
        let secret = context.request_nsk_app(msg_sender_npk_hash);
        let nullifier = poseidon2_hash([context.msg_sender().unwrap().to_field(), secret]);
        context.push_nullifier(nullifier);
        Governance::at(context.this_address())
    }

}
