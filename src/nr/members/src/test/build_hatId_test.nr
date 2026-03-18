use crate::types::hat_note::HatNote;
use crate::types::hat_id_constants::LEVEL_THRESHOLDS;

fn zero() -> Field {
    0
}

#[test]
unconstrained fn test_debug_level_thresholds() {
    let t1 = LEVEL_THRESHOLDS[1];
    assert(t1 == 65536, "threshold[1] should be 65536");
}

#[test] 
unconstrained fn test_debug_level_above() {
    let threshold = LEVEL_THRESHOLDS[1];
    let hatId: Field = 65536;
    let shifted = hatId / threshold;
    let is_above = shifted != 0;
    assert(is_above, "should be above threshold");
    assert(shifted == 1, "shifted should be 1");
}

#[test]
unconstrained fn test_debug_build_tophat() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let expected = 65536;
    assert(tophat == expected, "tophat should be 65536");
}

#[test]
unconstrained fn test_debug_level_4() {
    let admin = zero();
    let l1 = HatNote::buildHatId(admin, 1);
    let l2 = HatNote::buildHatId(l1, 1);
    let l3 = HatNote::buildHatId(l2, 1);
    let l4 = HatNote::buildHatId(l3, 1);
    
    let level1 = HatNote::getLocalHatLevel(l1);
    let level2 = HatNote::getLocalHatLevel(l2);
    let level3 = HatNote::getLocalHatLevel(l3);
    let level4 = HatNote::getLocalHatLevel(l4);
    
    assert(level1 == 1);
    assert(level2 == 2);
    assert(level3 == 3);
    assert(level4 == 4);
}

#[test]
unconstrained fn test_debug_get_level() {
    let tophat = HatNote::buildHatId(zero(), 1);
    assert(tophat == 65536, "tophat should be 65536");
    let level = HatNote::getLocalHatLevel(tophat);
    assert(level == 1, "level should be 1");
}

#[test]
unconstrained fn test_level_0_tophat() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let level = HatNote::getLocalHatLevel(tophat);
    assert(level == 1, "level should be 1");
}

#[test]
unconstrained fn test_level_1_child() {
    let admin = HatNote::buildHatId(zero(), 1);
    let child = HatNote::buildHatId(admin, 1);
    let level = HatNote::getLocalHatLevel(child);
    assert(level == 2, "level should be 2");
}

#[test]
unconstrained fn test_level_2_grandchild() {
    let admin = HatNote::buildHatId(zero(), 1);
    let child = HatNote::buildHatId(admin, 1);
    let grandchild = HatNote::buildHatId(child, 1);
    let level = HatNote::getLocalHatLevel(grandchild);
    assert(level == 3, "level should be 3");
}

#[test]
unconstrained fn test_level_3() {
    let admin = zero();
    let l1 = HatNote::buildHatId(admin, 1);
    let l2 = HatNote::buildHatId(l1, 1);
    let l3 = HatNote::buildHatId(l2, 1);
    let level = HatNote::getLocalHatLevel(l3);
    assert(level == 3, "level should be 3");
}

#[test]
unconstrained fn test_level_4() {
    let admin = zero();
    let l1 = HatNote::buildHatId(admin, 1);
    let l2 = HatNote::buildHatId(l1, 1);
    let l3 = HatNote::buildHatId(l2, 1);
    let l4 = HatNote::buildHatId(l3, 1);
    let level = HatNote::getLocalHatLevel(l4);
    assert(level == 4, "level should be 4");
}

#[test]
unconstrained fn test_siblings_at_level_1() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let child1 = HatNote::buildHatId(tophat, 1);
    let child2 = HatNote::buildHatId(tophat, 2);
    assert(child1 != child2, "siblings should be different");
}

#[test]
unconstrained fn test_siblings_at_level_2() {
    let tophat = HatNote::buildHatId(zero(), 1);
    let child = HatNote::buildHatId(tophat, 1);
    let grandchild1 = HatNote::buildHatId(child, 1);
    let grandchild2 = HatNote::buildHatId(child, 2);
    assert(grandchild1 != grandchild2, "siblings should be different");
}

#[test]
unconstrained fn test_tophat_is_tophat() {
    let tophat = HatNote::buildHatId(zero(), 1);
    assert(HatNote::isLocalTopHat(tophat), "tophat should be tophat");
}

#[test]
unconstrained fn test_child_not_tophat() {
    let admin = HatNote::buildHatId(zero(), 1);
    let child = HatNote::buildHatId(admin, 1);
    assert(!HatNote::isLocalTopHat(child), "child should not be tophat");
}

#[test]
unconstrained fn test_build_hat_id_chain_preserves_admin() {
    let admin = zero();
    let mut current = HatNote::buildHatId(admin, 1);
    for _i in 1..10 {
        let next = HatNote::buildHatId(current, 1);
        assert(next != current, "next should be different from current");
        current = next;
    }
}

#[test]
unconstrained fn test_different_hats_different_ids() {
    let admin = HatNote::buildHatId(zero(), 1);
    let child1 = HatNote::buildHatId(admin, 1);
    let child2 = HatNote::buildHatId(admin, 2);
    let child255 = HatNote::buildHatId(admin, 255);

    assert(child1 != child2, "child1 != child2");
    assert(child2 != child255, "child2 != child255");
    assert(child1 != child255, "child1 != child255");
}

#[test]
unconstrained fn test_level_10() {
    let admin = zero();
    let mut current = HatNote::buildHatId(admin, 1);
    for _i in 1..10 {
        current = HatNote::buildHatId(current, 1);
    }
    let level = HatNote::getLocalHatLevel(current);
    assert(level >= 9, "max level should be at least 9");
}

#[test]
unconstrained fn test_level_10_is_not_tophat() {
    let admin = zero();
    let mut current = HatNote::buildHatId(admin, 1);
    for _i in 1..10 {
        current = HatNote::buildHatId(current, 1);
    }
    let is_tophat = HatNote::isLocalTopHat(current);
    assert(!is_tophat, "level 10 should not be tophat");
}
