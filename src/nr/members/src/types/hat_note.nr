use aztec::{
    context::PrivateContext,
    macros::notes::custom_note,
    note::note_interface::NoteHash,
    protocol::{
        address::AztecAddress,
        constants::{DOM_SEP__NOTE_HASH, DOM_SEP__NOTE_NULLIFIER},
        hash::poseidon2_hash_with_separator,
        traits::{Packable, Serialize, ToField},
    },
};

use super::hat_id_constants::{LEVEL_THRESHOLDS, SHIFT_FACTORS};

global MAX_LEVELS: u32 = 11;

#[derive(Eq, Serialize, Packable)]
#[custom_note]
pub struct HatNote {
    pub eligibility: AztecAddress,
    pub maxSupply: u32,
    pub supply: u32,
    pub lastHatId: u16,
    pub toggle: AztecAddress,
    pub config: u16,
    pub hat_id: Field,
    pub hatted: AztecAddress,
}

impl NoteHash for HatNote {
    fn compute_note_hash(
        self,
        owner: AztecAddress,
        storage_slot: Field,
        randomness: Field,
    ) -> Field {
        let input = self.pack().concat([storage_slot, randomness, owner.to_field()]);
        poseidon2_hash_with_separator(input, DOM_SEP__NOTE_HASH)
    }

    fn compute_nullifier(
        self,
        _context: &mut PrivateContext,
        owner: AztecAddress,
        note_hash_for_nullification: Field,
    ) -> Field {
        poseidon2_hash_with_separator(
            [note_hash_for_nullification, owner.to_field()],
            DOM_SEP__NOTE_NULLIFIER,
        )
    }

    unconstrained fn compute_nullifier_unconstrained(
        self,
        owner: AztecAddress,
        note_hash_for_nullification: Field,
    ) -> Option<Field> {
        Option::some(poseidon2_hash_with_separator(
            [note_hash_for_nullification, owner.to_field()],
            DOM_SEP__NOTE_NULLIFIER,
        ))
    }
}

fn bits_to_u16(bits: [u1; 254], offset: u32) -> u16 {
    let mut result: u16 = 0;
    for i in 0..16 {
        let bit_val: u16 = if bits[offset + i] == 1 { 1 } else { 0 };
        result = result | (bit_val << i as u16);
    }
    result
}

fn bits_to_u32(bits: [u1; 254], offset: u32) -> u32 {
    let mut result: u32 = 0;
    for i in 0..32 {
        let bit_val: u32 = if bits[offset + i] == 1 { 1 } else { 0 };
        result = result | (bit_val << i);
    }
    result
}

impl HatNote {
    pub fn new(
        eligibility: AztecAddress,
        maxSupply: u32,
        supply: u32,
        lastHatId: u16,
        toggle: AztecAddress,
        config: u16,
        hat_id: Field,
        hatted: AztecAddress,
    ) -> Self {
        Self { eligibility, maxSupply, supply, lastHatId, toggle, config, hat_id, hatted }
    }

    pub fn get_hat_id(self) -> Field {
        self.hat_id
    }

    pub fn getTopHatDomain(hatId: Field) -> u32 {
        let bits = hatId.to_le_bits::<254>();
        bits_to_u32(bits, 176)
    }

    pub fn getLocalHatLevel(hatId: Field) -> u32 {
        let bits = hatId.to_le_bits::<254>();
        let mut level: u32 = 0;
        for i in 16..176 {
            if bits[i] == 1 {
                level = i / 16;
            }
        }
        level
    }

    pub fn isLocalTopHat(hatId: Field) -> bool {
        let is_zero = hatId == 0;
        let level = HatNote::getLocalHatLevel(hatId);
        (level == 1) & !is_zero
    }

    pub fn buildHatId(admin: Field, newHat: u16) -> Field {
        let parent_level = HatNote::getLocalHatLevel(admin);
        assert(parent_level < 10, "Cannot create hat at level 10");
        let child_level = parent_level + 1;
        let shift = SHIFT_FACTORS[child_level];
        admin + (newHat as Field) * shift
    }

    pub fn get_level_bits_at(hatId: Field, target_level: u32) -> u16 {
        let bits = hatId.to_le_bits::<254>();
        let bit_offset = target_level * 16;
        bits_to_u16(bits, bit_offset)
    }

    pub fn getAdminAtLocalLevel(hatId: Field, target_level: u32) -> Field {
        let domain = HatNote::getTopHatDomain(hatId);
        let domain_bits = (domain as Field) * LEVEL_THRESHOLDS[11];
        
        if target_level == 0 {
            domain_bits
        } else {
            let mut result = domain_bits;
            for i in 1..target_level + 1 {
                let level_bits = HatNote::get_level_bits_at(hatId, i);
                result = result + (level_bits as Field) * LEVEL_THRESHOLDS[i];
            }
            result
        }
    }

    pub fn isValidHatId(hatId: Field) -> bool {
        let level = HatNote::getLocalHatLevel(hatId);
        if level == 0 {
            true
        } else {
            let mut valid = true;
            for i in 1..level {
                let level_bits = HatNote::get_level_bits_at(hatId, i);
                if level_bits == 0 {
                    valid = false;
                }
            }
            valid
        }
    }
}
