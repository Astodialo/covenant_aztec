use crate::types::hat_note::HatNote;
use crate::types::hat_id_constants::LEVEL_THRESHOLDS;

fn zero() -> Field {
    0
}

#[test]
unconstrained fn test_getTopHatDomain_tophat() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let domain = HatNote::getTopHatDomain(tophat);
    assert(domain == 0, "tophat domain should be 0");
}

#[test]
unconstrained fn test_getTopHatDomain_value_1() {
    let hat: Field = 1;
    let domain = HatNote::getTopHatDomain(hat);
    assert(domain == 0, "getTopHatDomain(1) should be 0");
}

#[test]
unconstrained fn test_getTopHatDomain_level_1() {
    let admin = HatNote::buildHatId(zero(), 1);
    let domain = HatNote::getTopHatDomain(admin);
    assert(domain == 0, "level 1 domain should be 0");
}

#[test]
unconstrained fn test_getAdminAtLocalLevel_level_0() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let child = HatNote::buildHatId(tophat, 5);

    let child_level = HatNote::getLocalHatLevel(child);
    assert(child_level >= 2, "child should be at level 2 or higher");
    
    let domain = HatNote::getTopHatDomain(child);
    let admin_at_0 = HatNote::getAdminAtLocalLevel(child, 0);
    
    assert(domain == 0, "domain should be 0");
    assert(admin_at_0 == 0, "level 0 admin should be 0 for domain 0");
}

#[test]
unconstrained fn test_getAdminAtLocalLevel_level_1() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let child = HatNote::buildHatId(tophat, 5);
    let child_level = HatNote::getLocalHatLevel(child);
    assert(child_level >= 2, "child should be at level 2 or higher");
    
    let admin_at_1 = HatNote::getAdminAtLocalLevel(child, 1);
    // The level 1 admin should be the tophat itself
    assert(admin_at_1 == tophat, "admin at level 1 should be tophat");
}

#[test]
unconstrained fn test_getAdminAtLocalLevel_chain() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let l1 = HatNote::buildHatId(tophat, 2);
    let l2 = HatNote::buildHatId(l1, 3);
    let l3 = HatNote::buildHatId(l2, 4);

    let l3_level = HatNote::getLocalHatLevel(l3);
    assert(l3_level == 4, "l3 should be level 4");
    
    // Level 0 admin = domain = 0
    let admin_0 = HatNote::getAdminAtLocalLevel(l3, 0);
    assert(admin_0 == 0, "level 0 admin should be 0 for domain 0");
    
    // Level 1 admin = tophat
    let admin_1 = HatNote::getAdminAtLocalLevel(l3, 1);
    assert(admin_1 == tophat, "level 1 admin should be tophat");
}

#[test]
unconstrained fn test_getAdminAtLocalLevel_level_10_max() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let mut current = tophat;

    for _i in 1..10 {
        current = HatNote::buildHatId(current, 1);
    }

    let level = HatNote::getLocalHatLevel(current);
    assert(level >= 9, "should be at least level 9");

    let admin_10 = HatNote::getAdminAtLocalLevel(current, 10);
    let admin_9 = HatNote::getAdminAtLocalLevel(current, 9);

    assert(admin_10 != 0, "level 10 admin should not be zero");
    assert(admin_9 != 0, "level 9 admin should not be zero");
}

#[test]
unconstrained fn test_isValidHatId_tophat_valid() {
    let tophat = HatNote::buildHatId(zero(), 1);
    assert(HatNote::isValidHatId(tophat), "tophat should be valid");
}

#[test]
unconstrained fn test_isValidHatId_tophat_zero() {
    assert(HatNote::isValidHatId(zero()), "zero hat id should be valid (tophat)");
}

#[test]
unconstrained fn test_isValidHatId_child_valid() {
    let admin = HatNote::buildHatId(zero(), 1);
    let child = HatNote::buildHatId(admin, 1);
    assert(HatNote::isValidHatId(child), "child should be valid");
}

#[test]
unconstrained fn test_isValidHatId_chain_valid() {
    let admin = HatNote::buildHatId(zero(), 1);
    let l1 = HatNote::buildHatId(admin, 1);
    let l2 = HatNote::buildHatId(l1, 1);
    let l3 = HatNote::buildHatId(l2, 1);

    assert(HatNote::isValidHatId(l1), "l1 valid");
    assert(HatNote::isValidHatId(l2), "l2 valid");
    assert(HatNote::isValidHatId(l3), "l3 valid");
}

#[test]
unconstrained fn test_isValidHatId_max_level_valid() {
    let admin: Field = 0;
    let mut current = HatNote::buildHatId(admin, 1);

    for _i in 1..10 {
        current = HatNote::buildHatId(current, 1);
    }

    assert(HatNote::isValidHatId(current), "max level chain should be valid");
}

#[test]
unconstrained fn test_isValidHatId_different_child_ids() {
    let admin = HatNote::buildHatId(zero(), 1);
    let child1 = HatNote::buildHatId(admin, 1);
    let child2 = HatNote::buildHatId(admin, 100);
    let child65535 = HatNote::buildHatId(admin, 65535);

    assert(HatNote::isValidHatId(child1), "child 1 valid");
    assert(HatNote::isValidHatId(child2), "child 100 valid");
    assert(HatNote::isValidHatId(child65535), "child max valid");
}

#[test]
unconstrained fn test_isValidHatId_deep_chain() {
    let admin: Field = 0;
    let mut hat = HatNote::buildHatId(admin, 1);

    for _i in 1..11 {
        assert(HatNote::isValidHatId(hat), "hat should be valid");
        hat = HatNote::buildHatId(hat, 1);
    }
}

#[test]
unconstrained fn test_getTopHatDomain_tophat_level_1() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let level = HatNote::getLocalHatLevel(tophat);
    let domain = HatNote::getTopHatDomain(tophat);
    assert(level == 1, "tophat should be level 1");
    assert(domain == 0, "domain should be 0");
}

#[test]
unconstrained fn test_isLocalTopHat_consistency() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let level = HatNote::getLocalHatLevel(tophat);
    let is_tophat = HatNote::isLocalTopHat(tophat);
    assert(level == 1, "level should be 1");
    assert(is_tophat, "should be tophat");
}

#[test]
unconstrained fn test_level_0_is_zero() {
    let domain_only: Field = 0;
    let level = HatNote::getLocalHatLevel(domain_only);
    assert(level == 0, "level 0 should be 0");
}

#[test]
unconstrained fn test_isLocalTopHat_zero_hat_id() {
    let zero_hat: Field = 0;
    let is_tophat = HatNote::isLocalTopHat(zero_hat);
    assert(!is_tophat, "zero hat id should not be tophat");
}

#[test]
unconstrained fn test_isLocalTopHat_level_2_and_above() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let level2 = HatNote::buildHatId(tophat, 1);
    let level3 = HatNote::buildHatId(level2, 1);
    
    assert(HatNote::isLocalTopHat(tophat), "tophat should be tophat");
    assert(!HatNote::isLocalTopHat(level2), "level 2 should not be tophat");
    assert(!HatNote::isLocalTopHat(level3), "level 3 should not be tophat");
}

#[test]
unconstrained fn test_getTopHatDomain_nonzero_domain() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let hat_with_domain = tophat + 42 * LEVEL_THRESHOLDS[11];
    let extracted_domain = HatNote::getTopHatDomain(hat_with_domain);
    assert(extracted_domain == 42, "domain should be 42");
}

#[test]
unconstrained fn test_getTopHatDomain_level_2_with_nonzero_domain() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let hat_with_domain = tophat + 100 * LEVEL_THRESHOLDS[11];
    
    let extracted_domain = HatNote::getTopHatDomain(hat_with_domain);
    assert(extracted_domain == 100, "domain should be preserved");
}

#[test]
unconstrained fn test_getTopHatDomain_max_domain() {
    let max_domain: Field = 0xFFFFFFFF;
    let max_value: Field = max_domain * LEVEL_THRESHOLDS[11] + 1;
    let level = HatNote::getLocalHatLevel(max_value);
    assert(level == 0, "max domain value should be level 0");
}

#[test]
unconstrained fn test_getAdminAtLocalLevel_level_11() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let mut current = tophat;
    
    for _i in 1..10 {
        current = HatNote::buildHatId(current, 1);
    }
    
    let level_from_func = HatNote::getLocalHatLevel(current);
    assert(level_from_func >= 9, "should be at least level 9");
    
    let level10_admin = HatNote::getAdminAtLocalLevel(current, 10);
    assert(level10_admin != 0, "level 10 admin should not be zero");
}

#[test]
unconstrained fn test_getAdminAtLocalLevel_zero_hat_id_level_0() {
    let zero_hat: Field = 0;
    let admin_at_0 = HatNote::getAdminAtLocalLevel(zero_hat, 0);
    assert(admin_at_0 == 0, "zero hat at level 0 should return zero");
}

#[test]
unconstrained fn test_getAdminAtLocalLevel_zero_hat_id_level_1() {
    let zero_hat: Field = 0;
    let admin_at_1 = HatNote::getAdminAtLocalLevel(zero_hat, 1);
    assert(admin_at_1 == 0, "zero hat at level 1 should return zero");
}

#[test]
unconstrained fn test_getAdminAtLocalLevel_exact_level_match() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let level2 = HatNote::buildHatId(tophat, 7);
    
    let admin_at_2 = HatNote::getAdminAtLocalLevel(level2, 2);
    assert(admin_at_2 == level2, "level 2 admin should be the hat itself");
}

#[test]
unconstrained fn test_getAdminAtLocalLevel_chain_full_extraction() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let l1 = HatNote::buildHatId(tophat, 2);
    let l2 = HatNote::buildHatId(l1, 3);
    
    let admin_2 = HatNote::getAdminAtLocalLevel(l2, 2);
    assert(admin_2 == l1, "level 2 admin should be l1");
}

#[test]
unconstrained fn test_isValidHatId_invalid_intermediate_zero_level_1() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let l1 = HatNote::buildHatId(tophat, 5);
    let l2 = HatNote::buildHatId(l1, 10);
    
    assert(HatNote::isValidHatId(tophat), "tophat should be valid");
    assert(HatNote::isValidHatId(l1), "l1 should be valid");
    assert(HatNote::isValidHatId(l2), "l2 should be valid");
}

#[test]
unconstrained fn test_isValidHatId_invalid_level_2_with_zero_level_1() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let l1 = HatNote::buildHatId(tophat, 5);
    
    assert(HatNote::isValidHatId(tophat), "tophat valid");
    assert(HatNote::isValidHatId(l1), "level 1 valid");
}

#[test]
unconstrained fn test_isValidHatId_invalid_deep_chain_with_gap() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let l1 = HatNote::buildHatId(tophat, 1);
    let l2 = HatNote::buildHatId(l1, 1);
    
    assert(HatNote::isValidHatId(tophat), "tophat valid");
    assert(HatNote::isValidHatId(l1), "l1 valid");
    assert(HatNote::isValidHatId(l2), "l2 valid");
}

#[test]
unconstrained fn test_isValidHatId_all_16_bit_values_valid() {
    let tophat = HatNote::buildHatId(zero(), 1);
    
    for i in 1..16 {
        let hat = HatNote::buildHatId(tophat, i as u16);
        assert(HatNote::isValidHatId(hat), "hat id should be valid");
    }
}

#[test]
unconstrained fn test_isValidHatId_max_u16_values() {
    let tophat = HatNote::buildHatId(zero(), 1);
    
    let hat_65535 = HatNote::buildHatId(tophat, 65535);
    assert(HatNote::isValidHatId(hat_65535), "max u16 value should be valid");
    
    let level2_max = HatNote::buildHatId(hat_65535, 65535);
    assert(HatNote::isValidHatId(level2_max), "level 2 with max values should be valid");
}

#[test]
unconstrained fn test_isValidHatId_boundary_level_10() {
    let mut hat: Field = 0;
    
    for _i in 1..11 {
        hat = HatNote::buildHatId(hat, 1);
    }
    
    let level = HatNote::getLocalHatLevel(hat);
    assert(level >= 9, "should be at least level 9");
    assert(HatNote::isValidHatId(hat), "max level should be valid");
}

#[test]
unconstrained fn test_isLocalTopHat_and_isValidHatId_consistency() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let child = HatNote::buildHatId(tophat, 1);
    
    assert(HatNote::isLocalTopHat(tophat) == HatNote::isValidHatId(tophat), "tophat consistency");
    assert(HatNote::isLocalTopHat(child) == false, "child is not tophat");
    assert(HatNote::isValidHatId(child) == true, "child is valid");
}
