package com.badri.clinic.repository;

import com.badri.clinic.model.MessageThread;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ThreadRepository extends MongoRepository<MessageThread, String> {

    List<MessageThread> findAllByOrderByLastMessageAtDesc();

    List<MessageThread> findByPatientIdOrderByLastMessageAtDesc(String patientId);

    long countByUnreadForDoctorGreaterThan(int value);

    List<MessageThread> findByPatientId(String patientId);
}
